//! A concurrent memory pool for fixed-size objects.
//!
//! `ArrayPool` allocates arrays of `T` memory according to the compile-time specified `CAP`.
//! The goal is to be able to allocate and deallocate `T` on the fly, but without actually asking
//! the system for more memory until demand exceeds total capacity.
//!
//! Make a pool with `ArrayPool::new`, allocate with `ArrayPool::alloc`, and drop the returned `Orc`
//! pointer to release the memory back to the pool. Release a segment of memory back to the system
//! with `ArrayPool::trim`.
//!
//! # Design
//!
//! Allocating threads must first acquire the lists lock and increment the reference count of the
//! head of the partial list, after which the lists lock can be released and the thread may work
//! with the segment directly, which has its own synchronization.
//!
//! With an acquired segment, the `reserved` counter must be incremented to reserve a slot.
//! When reserved is already at `CAP`, release the reference and try again with a new segment.
//! The thread that reserves the last slot **must** acquire the lists lock and move the segment to
//! the full list. After a reservation has been made, the slot memory is handed to the user as an
//! `Orc` pointer.
//!
//! When the `Orc` pointer drops, the deallocating thread must acquire a partition lock and attach
//! the slot to the list, and then signal availability in the partition bitmap while still holding
//! the lock.
//!
//! After the slot has been stored in a partition, acquire the segment lock to decrement the
//! reservation counter. If the thread is returning a slot to a segment on the full list, it
//! **must** acquire the lists lock and move the segment to the partial list. While still holding
//! the segment lock, decrement the reference count. If the reference count is zero, the thread
//! **must** attempt to swap field `rc` to the `FROZEN` state to claim ownership. If this succeeds,
//! the thread **must** acquire the lists lock and move the segment to the frozen list.
//!
//! # Lock Ordering
//!
//! Nested locking must happen in the following partial order:
//!
//! `Partition Head` → `Partition` → `Segment` → `Grow` → `Pool`
//!
//! For example, a `Partition` lock holder must not attempt to acquire the `Partition Head` lock,
//! as the `Partition Head` holder will already be attempting to acquire `Partition` locks.

use std::alloc::{Layout, alloc, dealloc, handle_alloc_error};
use std::array;
use std::cell::UnsafeCell;
use std::marker::PhantomData;
use std::mem::{ManuallyDrop, offset_of};
use std::ops::{Deref, DerefMut};
use std::ptr::{NonNull, drop_in_place};
use std::sync::atomic::Ordering::{Acquire, Relaxed, Release};
use std::sync::atomic::{AtomicI32, AtomicU32, AtomicU64, AtomicUsize};
use std::thread::sleep;
use std::time::Duration;

use crate::cache_padded::Pad;
use crate::inc_guard::atomic::AtomicIncrementGuard;
use crate::spin::Sleeplock;

/// A concurrent memory pool for fixed-size objects.
pub struct ArrayPool<T, const CAP: usize> {
    /// Inner pool data. Segments allocated by the pool will update some pool-wide shared data, so
    /// they need to store pointers. This is a stable address for that data.
    inner: NonNull<PoolInner<T>>,
    /// No segments will maintain pointers to this field, it is only used by the pool itself.
    /// Contains the number of slots currently being allocated.
    grow_lock: Sleeplock<usize>,
}

unsafe impl<T, const CAP: usize> Send for ArrayPool<T, CAP> {}
unsafe impl<T, const CAP: usize> Sync for ArrayPool<T, CAP> {}

impl<T, const CAP: usize> ArrayPool<T, CAP> {
    /// Returns a new `ArrayPool` with `min` segments allocated and ready to use.
    /// Total available items are `CAP * min`.
    pub fn new(min: u32) -> Self {
        let min = min.max(1);
        const { Self::asserts() };

        let segment_size = size_of::<Segment<T, CAP>>();
        let inner_size = size_of::<PoolInner<T>>();
        let segment_bytes = segment_size.saturating_mul(min as usize);
        let allocated_bytes = AtomicUsize::new(segment_bytes.saturating_add(inner_size));

        let layout = Layout::new::<PoolInner<T>>();

        // SAFETY: Layout of `PoolInner` has non-zero size.
        let inner_ptr: *mut PoolInner<T> = unsafe { alloc(layout).cast() };
        if inner_ptr.is_null() {
            handle_alloc_error(layout);
        }

        // SAFETY: `inner_ptr` is non-null and valid to dereference.
        // Initializing the lists here is fine because it is heap allocated and will not move again.
        unsafe {
            (*inner_ptr).stats = Pad::new(PoolStats::new());
            (*inner_ptr).stats.value.allocated_bytes.value = allocated_bytes;
            (*inner_ptr).lists = Sleeplock::new(Lists::uninit(min));

            // `inner_ptr` points to heap memory, and both `stats` and `lists` are initialized,
            // now `init` the links.
            let lists = (*inner_ptr).lists.get_mut();
            lists.init_to_self();

            let inner_nn = NonNull::new_unchecked(inner_ptr);
            for _ in 0..min {
                let seg: NonNull<Segment<T, CAP>> = Segment::new_on_heap(inner_nn);
                Lists::push_to_partial_head(lists, seg.cast());
            }

            let grow_lock = Sleeplock::new(0);
            Self { inner: inner_nn, grow_lock }
        }
    }

    /// Asserts:
    ///     1. no padding between `header` and `slots`,
    ///     2. `CAP` must be >= 2. Really CAP should be much larger for this memory pool to be
    ///        useful, but at least two or the segment lifecycle will break.
    ///     3. Layout of `PoolInner` must not be zero-sized, because it will be allocated.
    #[rustfmt::skip]
    const fn asserts() {
        let offset = offset_of!(Segment<T, CAP>, slots);
        let header_size = size_of::<SegmentHeader<T>>();

        assert!(offset == header_size, "Invalid segment header layout");
        assert!(CAP >= 2, "Pool cap must be >= 2");

        assert!(size_of::<PoolInner<T>>() > 0, "PoolInner must not be a ZST");
    }

    /// Allocates `value` in the pool and returns an `Orc` pointer to access it.
    pub fn alloc<'pool>(&'pool self, value: T) -> Orc<'pool, T> {
        // SAFETY: `inner` is valid to dereference.
        // It is not deallocated until the pool is dropped.
        let _alloc_sig_guard = unsafe { (*self.inner.as_ptr()).stats.value.is_allocating() };

        'retry: loop {
            let acquired = unsafe { (*self.inner.as_ptr()).lists.lock().acquire_partial() };

            let header = match acquired {
                Ok(Some(head)) => head,
                Ok(None) => {
                    self.lock_grow();
                    continue 'retry;
                }
                Err(Blocked) => {
                    snooze();
                    continue 'retry;
                }
            };

            // SAFETY: `header` is valid to dereference.
            // Segments are not deallocated until they hit the frozen list, or the pool drops.
            // Now lock_reserve can safely acquire the lists lock when needed without deadlocking.
            unsafe { SegmentHeader::lock_reserve(header) };
            let slot = Segment::<T, CAP>::alloc_reserved(header.cast(), value);
            return Orc::new(slot);
        }
    }

    /// Attempts to acquire the grow lock and allocate new memory.
    /// If another thread wins the race, yield and return.
    fn lock_grow(&self) {
        let Some(mut grow_lock) = self.grow_lock.try_lock() else {
            snooze();
            return;
        };

        // SAFETY: `inner` is valid to dereference.
        // The memory is not deallocated until the pool is dropped.
        unsafe {
            let lists_ptr = &raw const (*self.inner.as_ptr()).lists;
            let stats_ptr = &raw const (*self.inner.as_ptr()).stats;

            let deallocs = (*stats_ptr).value.in_flight_deallocs.value.load(Relaxed);
            let allocs = (*stats_ptr).value.in_flight_allocs.value.load(Relaxed);
            if deallocs >= (allocs + *grow_lock) {
                // Avoid allocating when deallocators/inbound memory can handle it.
                snooze();
                return;
            }

            // Mark the number of slots this thread will add.
            *grow_lock += CAP;
            drop(grow_lock);

            let seg = Segment::<T, CAP>::new_on_heap(self.inner);
            (*stats_ptr)
                .value
                .allocated_bytes
                .value
                .fetch_add(size_of::<Segment<T, CAP>>(), Relaxed);

            let mut lists_lock = (*lists_ptr).lock();
            lists_lock.push_to_partial_head(seg.cast());
            drop(lists_lock);

            // Now the new slots are in the pool, undo the mark.
            let mut grow_lock = self.grow_lock.lock();
            *grow_lock -= CAP;
            // Drop explicitly just in case more is added to this function.
            // It doesn't need to be locked anymore.
            drop(grow_lock);
        }
    }

    pub fn trim(&self) {
        // SAFETY: `inner` is valid to dereference.
        // The memory is not deallocated until the pool is dropped.
        unsafe {
            let mut lists_lock = (*self.inner.as_ptr()).lists.lock();
            if (*lists_lock).num_segments <= (*lists_lock).min_segments {
                return;
            }

            let Some(frozen_ptr) = lists_lock.pop_frozen() else {
                return;
            };
            drop(lists_lock);

            // SAFETY: `frozen_ptr` was allocated using `alloc` with the same layout.
            dealloc(frozen_ptr.as_ptr().cast(), Layout::new::<Segment<T, CAP>>());
        }
    }
} // impl ArrayPool

impl<T, const CAP: usize> Drop for ArrayPool<T, CAP> {
    fn drop(&mut self) {
        let inner_ptr = self.inner.as_ptr();
        // SAFETY: `inner_ptr` is valid to dereference. It gets deallocated at the end.
        // The layouts used for deallocation are the same ones used in `alloc` calls.
        unsafe {
            let lists = (*inner_ptr).lists.get_mut();
            let stats = &(*inner_ptr).stats;

            #[rustfmt::skip]
            debug_assert!(stats.value.in_flight_allocs.value.load(Relaxed) == 0 && stats.value.in_flight_deallocs.value.load(Relaxed) == 0, "In-flight operations must finish before pool dealloc");
            #[rustfmt::skip]
            debug_assert!(Link::is_empty(lists.partial) && Link::is_empty(lists.full), "All slots must be returned before pool dealloc");

            let seg_layout = Layout::new::<Segment<T, CAP>>();
            while let Some(node) = Link::pop_head(lists.frozen) {
                let header = SegmentHeader::<T>::from_link(node);
                dealloc(header.as_ptr().cast(), seg_layout);
            }

            let link_layout = Layout::new::<Link>();
            dealloc(lists.partial.as_ptr().cast(), link_layout);
            dealloc(lists.full.as_ptr().cast(), link_layout);
            dealloc(lists.frozen.as_ptr().cast(), link_layout);
            dealloc(inner_ptr.cast(), Layout::new::<PoolInner<T>>());
        }
    }
}

/// A thread-safe reference-counting pointer.
pub struct Orc<'pool, T> {
    slot: NonNull<Slot<T>>,
    _pd: PhantomData<&'pool ()>,
}

impl<'pool, T> Orc<'pool, T> {
    /// Returns a new `Orc` pointer.
    ///
    /// # Safety
    ///
    /// `slot` must be a a valid pointer to allocated memory.
    fn new(slot: NonNull<Slot<T>>) -> Self {
        Orc { slot, _pd: PhantomData }
    }

    /// Drops the user data `T` in place.
    ///
    /// # Safety
    ///
    /// Has the same safety requirements as `drop_in_place`. User data `T` must be initialized and
    /// not already dropped.
    #[inline]
    unsafe fn drop_user_data(&mut self) {
        unsafe {
            let data: *mut ManuallyDrop<T> = &raw mut (*self.slot.as_ptr()).payload.data;
            drop_in_place(data as *mut T);
        }
    }
}

impl<'pool, T> Deref for Orc<'pool, T> {
    type Target = T;

    #[inline]
    fn deref(&self) -> &Self::Target {
        unsafe { &(*self.slot.as_ptr()).payload.data }
    }
}

impl<'pool, T> DerefMut for Orc<'pool, T> {
    #[inline]
    fn deref_mut(&mut self) -> &mut Self::Target {
        unsafe { &mut (*self.slot.as_ptr()).payload.data }
    }
}

impl<'pool, T> Drop for Orc<'pool, T> {
    fn drop(&mut self) {
        unsafe {
            let header = (*self.slot.as_ptr()).header;
            self.drop_user_data();
            SegmentHeader::<T>::lock_dealloc_slot(header, self.slot);
        }
    }
}

/// Shared pool data.
#[repr(C)]
struct PoolInner<T> {
    lists: Sleeplock<Lists<T>>,
    stats: Pad<PoolStats>,
}

/// Manages the intrusive linked lists of segments that form the pool. Lists are circular and
/// organized by capacity state. The three fields `partial`, `full`, and `frozen` are "dummy" links.
/// When a list is empty, the dummy `prev` and `next` point to itself. When it has exactly one item,
/// they point to that one item, and the `prev` and `next` of that one item point back to the dummy.
/// Otherwise, `next` points to the head of the list and `prev` to the tail.
struct Lists<T> {
    partial: NonNull<Link>,
    full: NonNull<Link>,
    frozen: NonNull<Link>,
    /// Number of allocated segments across all lists.
    num_segments: u32,
    /// Minimum segments to keep allocated.
    min_segments: u32,
    _pd: PhantomData<T>,
}

/// The list is blocked by a frozen segment.
struct Blocked;

impl<T> Lists<T> {
    /// Returns a new uninitialized `Lists` that must be initialized before use.
    fn uninit(min: u32) -> Self {
        unsafe {
            let layout = Layout::new::<Link>();

            let alloc_link = || {
                let ptr = alloc(layout) as *mut Link;
                if ptr.is_null() {
                    handle_alloc_error(layout);
                }
                ptr.write(Link::uninit());
                NonNull::new_unchecked(ptr)
            };

            Lists {
                partial: alloc_link(),
                full: alloc_link(),
                frozen: alloc_link(),
                num_segments: 0,
                min_segments: min,
                _pd: PhantomData,
            }
        }
    }

    /// Initializes the list links using the current pointers of `self`.
    ///
    /// # Safety
    ///
    /// Must be called only after `self` resides at its final memory address.
    unsafe fn init_to_self(&mut self) {
        unsafe {
            Link::init(self.partial);
            Link::init(self.full);
            Link::init(self.frozen);
        }
    }

    // Returns an acquired reference to a partially filled segment, or None when no segments are
    // available for allocation. Returns an error if the list is blocked.
    #[inline]
    fn acquire_partial(&mut self) -> Result<Option<NonNull<SegmentHeader<T>>>, Blocked> {
        if let Some(header) = self.partial_head() {
            let ptr = header.as_ptr();
            // SAFETY: `header_ptr` is valid to dereference.
            // Segment memory is not deallocated while the lock is held.
            unsafe {
                let prev_rc = (*ptr).rc.value.fetch_add(1, Acquire);
                if prev_rc < 0 || prev_rc as usize >= (*ptr).cap {
                    // The segment is frozen and the freezer is on the way to clear it,
                    // or the segment is over-acquired and won't be able to serve the request.
                    // The thread that takes the last slot will move it.
                    (*ptr).rc.value.fetch_sub(1, Relaxed);
                    return Err(Blocked);
                }
            }
            return Ok(Some(header));
        }

        // Try to recycle a frozen segment.
        if let Some(header) = self.pop_frozen_to_partial_head() {
            // SAFETY: `header` is valid to dereference.
            // Segment memory is not deallocated while the lock is held.
            unsafe { (*header.as_ptr()).rc.value.store(1, Release) };
            return Ok(Some(header));
        }

        // The pool has nothing available.
        Ok(None)
    }

    /// Returns a pointer to the head of the partial list, or None when the list is empty.
    #[inline]
    fn partial_head(&self) -> Option<NonNull<SegmentHeader<T>>> {
        // SAFETY: `self.partial.next` is inside an allocated `SegmentHeader`.
        unsafe {
            if Link::is_empty(self.partial) {
                return None;
            }
            let partial = *(*self.partial.as_ptr()).next.get();
            Some(SegmentHeader::from_link(partial))
        }
    }

    /// Moves a segment in the partial list to the full list.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_partial_to_full(&mut self, header: NonNull<SegmentHeader<T>>) {
        unsafe {
            let link = SegmentHeader::link_ptr(header);
            Link::move_head(self.full, link);
        }
    }

    /// Moves a segment in the partial list to the frozen list.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_partial_to_frozen(&mut self, header: NonNull<SegmentHeader<T>>) {
        unsafe {
            let link = SegmentHeader::link_ptr(header);
            Link::move_head(self.frozen, link);
        }
    }

    /// Moves a segment in the full list to the partial list tail.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_full_to_partial_tail(&mut self, header: NonNull<SegmentHeader<T>>) {
        unsafe {
            let link = SegmentHeader::link_ptr(header);
            Link::move_tail(self.partial, link);
        }
    }

    /// Pops a segment off the frozen list head and decrements segment count.
    #[inline]
    fn pop_frozen(&mut self) -> Option<NonNull<SegmentHeader<T>>> {
        // SAFETY: `first_frozen_link` is inside an allocated `SegmentHeader`.
        let header = unsafe {
            let first_frozen_link = Link::pop_head(self.frozen)?; // Empty list, early return.
            SegmentHeader::from_link(first_frozen_link)
        };
        self.num_segments = self.num_segments.saturating_sub(1);
        Some(header)
    }

    /// Pops a segment off the frozen list and resets it before attaching it to the partial list head.
    #[inline]
    fn pop_frozen_to_partial_head(&mut self) -> Option<NonNull<SegmentHeader<T>>> {
        unsafe {
            if Link::is_empty(self.frozen) {
                return None;
            }

            let first_frozen_link = *(*self.frozen.as_ptr()).next.get();

            // Segments on partial **must** be ready to use, so reset it.
            let header = SegmentHeader::from_link(first_frozen_link);
            SegmentHeader::reset(header);

            // Attach it.
            Link::move_head(self.partial, first_frozen_link);
            Some(header)
        }
    }

    /// Attaches a segment to the partial list head and increments segment count.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn push_to_partial_head(&mut self, header: NonNull<SegmentHeader<T>>) {
        unsafe {
            let link = SegmentHeader::link_ptr(header);
            Link::push_head(self.partial, link);
        }
        self.num_segments = self.num_segments.saturating_add(1);
    }
} // impl Lists

/// Circular list links. The internal links are dangling pointers and must be initialized with
/// `init` after reaching a stable memory address.
#[repr(C)]
struct Link {
    prev: UnsafeCell<NonNull<Link>>,
    next: UnsafeCell<NonNull<Link>>,
}

impl Link {
    /// Returns a new `Link` with dangling pointers.
    /// The returned structure must be initialized using `Link::init` before use.
    #[inline]
    const fn uninit() -> Self {
        Self {
            prev: UnsafeCell::new(NonNull::dangling()),
            next: UnsafeCell::new(NonNull::dangling()),
        }
    }

    /// Initializes `list` as linking to itself.
    ///
    /// # Safety
    ///
    /// `list` must be valid to dereference.
    #[inline]
    unsafe fn init(list: NonNull<Link>) {
        let ptr = list.as_ptr();
        unsafe {
            *(*ptr).next.get() = list;
            *(*ptr).prev.get() = list;
        }
    }

    /// Returns `true` if the list is empty.
    ///
    /// # Safety
    ///
    /// `list` must be valid to dereference.
    #[inline]
    unsafe fn is_empty(list: NonNull<Link>) -> bool {
        unsafe { *(*list.as_ptr()).next.get() == list }
    }

    /// Detaches `seg` from its current list by storing dangling pointers.
    ///
    /// # Safety
    ///
    /// `seg` must be valid to dereference.
    #[inline]
    unsafe fn unlink(seg: NonNull<Link>) {
        let ptr = seg.as_ptr();
        unsafe {
            let prev = *(*ptr).prev.get();
            let next = *(*ptr).next.get();
            *(*prev.as_ptr()).next.get() = next;
            *(*next.as_ptr()).prev.get() = prev;
            *(*ptr).prev.get() = NonNull::dangling();
            *(*ptr).next.get() = NonNull::dangling();
        }
    }

    /// Moves `seg` to the head of `list`. It is not necessary to `unlink` it first.
    ///
    /// # Safety
    ///
    /// `list` and `seg` must be valid to dereference.
    #[inline]
    unsafe fn move_head(list: NonNull<Link>, seg: NonNull<Link>) {
        let list_ptr = list.as_ptr();
        let seg_ptr = seg.as_ptr();
        unsafe {
            // Patch old list.
            let prev = *(*seg_ptr).prev.get();
            let next = *(*seg_ptr).next.get();
            *(*prev.as_ptr()).next.get() = next;
            *(*next.as_ptr()).prev.get() = prev;

            // Attach to new list head.
            let first = *(*list_ptr).next.get();
            *(*seg_ptr).prev.get() = list;
            *(*seg_ptr).next.get() = first;
            *(*first.as_ptr()).prev.get() = seg;
            *(*list_ptr).next.get() = seg;
        }
    }

    /// Moves `seg` to the tail of `list`. It is not necessary to `unlink` it first.
    ///
    /// # Safety
    ///
    /// `list` and `seg` must be valid to dereference.
    #[inline]
    unsafe fn move_tail(list: NonNull<Link>, seg: NonNull<Link>) {
        let list_ptr = list.as_ptr();
        let seg_ptr = seg.as_ptr();
        unsafe {
            // Patch old list.
            let old_prev = *(*seg_ptr).prev.get();
            let old_next = *(*seg_ptr).next.get();
            *(*old_prev.as_ptr()).next.get() = old_next;
            *(*old_next.as_ptr()).prev.get() = old_prev;

            // Attach to new list tail.
            let last = *(*list_ptr).prev.get();
            *(*seg_ptr).prev.get() = last;
            *(*seg_ptr).next.get() = list;
            *(*last.as_ptr()).next.get() = seg;
            *(*list_ptr).prev.get() = seg;
        }
    }

    /// Attaches `seg` to the head of `list`.
    ///
    /// # Safety
    ///
    /// `list` and `seg` must be valid to dereference.
    #[inline]
    unsafe fn push_head(list: NonNull<Link>, seg: NonNull<Link>) {
        let list_ptr = list.as_ptr();
        let seg_ptr = seg.as_ptr();
        unsafe {
            let first = *(*list_ptr).next.get();
            *(*seg_ptr).prev.get() = list;
            *(*seg_ptr).next.get() = first;
            *(*first.as_ptr()).prev.get() = seg;
            *(*list_ptr).next.get() = seg;
        }
    }

    /// Pops and returns the head of `list`.
    ///
    /// # Safety
    ///
    /// `list` must be valid to dereference.
    #[inline]
    unsafe fn pop_head(list: NonNull<Link>) -> Option<NonNull<Link>> {
        // SAFETY: `list` is valid to dereference.
        // The list is not empty, so `next` must also be valid to dereference.
        unsafe {
            if Self::is_empty(list) {
                return None;
            }
            let first_link = *(*list.as_ptr()).next.get();
            Self::unlink(first_link);
            Some(first_link)
        }
    }
} // impl Links

/// Header memory region for `Segment`.
/// Contains the state needed to manage an array of allocatable slots.
#[rustfmt::skip]
struct SegmentHeader<T> {
    /// Reference count tracking the number of threads holding pointers to this segment.
    rc: Pad<AtomicI32>,
    /// Index tracking the bump-allocation boundary. Used during initial "fast" phase of slot
    /// allocation. When exhausted, allocations come from `partition_head`.
    bump_index: Pad<AtomicU64>,
    /// Bitmap state for `partitions`. The `partitions.len()` least significant bits are used to
    /// track availability of the partitions. Bits read 0 when they are empty. Readable lock-free.
    partitions_bm: Pad<AtomicU32>,

    /*** Read ***/

    /// Shared pool data.
    pool_inner: NonNull<PoolInner<T>>,
    /// Equal to the associated `Segment::CAP` of the segment this header is paired with. Stored
    /// here as a field to avoid making the header generic over `CAP`. This means `Orc` can also
    /// avoid being generic over `CAP`, which is nice because the user doesn't care about segment
    /// capacity when they are just trying to use their `T`.
    cap: usize,

    /************/

    /// Primary partition for allocators.
    partition_head: Pad<Sleeplock<Option<NonNull<Slot<T>>>>>,
    /// Sharded partitions for deallocators. Reserved slots are returned to partitions here, and
    /// allocating threads lock a partition (using `partitions_bm` as a hint) to steal the list back
    /// to `partition_head` as needed.
    partitions: [Pad<Sleeplock<Option<NonNull<Slot<T>>>>>; 4],

    /// Number of slots reserved for allocation. It must be incremented on allocation and
    /// decremented *after* a slot is linked back to a partition.
    /// When the segment is full `(reserved == cap)` it must be moved from partial to full.
    reserved: Sleeplock<usize>,
    // Intrusive links to other segments. Accessed by the holder of the pool lists lock.
    list_link: Link,
}

// ***

// These are originally from the Linux kernel, but have been modified.
// https://rust.docs.kernel.org/src/kernel/lib.rs.html#220-228

#[doc(hidden)]
fn assert_same_type<T>(_: T, _: T) {}

macro_rules! container_of {
    ($field_ptr:expr, $Container:ty, $($fields:tt)*) => {{
        let offset: usize = ::core::mem::offset_of!($Container, $($fields)*);
        let field_ptr = $field_ptr;
        unsafe {
            let container_ptr = field_ptr.byte_sub(offset).cast::<$Container>();
            assert_same_type(field_ptr, (&raw const (*container_ptr).$($fields)*).cast_mut());
            container_ptr
        }
    }}
}

// ***

impl<T> SegmentHeader<T> {
    /// Frozen segment sentinel value.
    const FROZEN: i32 = i32::MIN;

    /// Returns a new `SegmentHeader`.
    fn new(inner: NonNull<PoolInner<T>>, cap: usize) -> Self {
        SegmentHeader {
            partition_head: Pad::new(Sleeplock::new(None)),
            partitions: array::from_fn(|_| Pad::new(Sleeplock::new(None))),
            pool_inner: inner,
            cap,
            rc: Pad::new(0.into()),
            bump_index: Pad::new(0.into()),
            reserved: Sleeplock::new(0),
            list_link: Link::uninit(),
            partitions_bm: Pad::new(0.into()),
        }
    }

    /// Returns the `SegmentHeader` associated with `link`.
    ///
    /// # Safety
    ///
    /// `link` and the returned pointer must be in bounds of the same allocation.
    #[inline]
    unsafe fn from_link(link: NonNull<Link>) -> NonNull<Self> {
        let header_ptr = container_of!(link.as_ptr(), Self, list_link);
        unsafe { NonNull::new_unchecked(header_ptr) }
    }

    /// Returns a pointer to the `Link` of `header`.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn link_ptr(header: NonNull<Self>) -> NonNull<Link> {
        unsafe {
            let header_link = &raw mut (*header.as_ptr()).list_link;
            NonNull::new_unchecked(header_link)
        }
    }

    /// Reserves a slot in the segment by incrementing the reservation counter.
    /// Assumes a slot *can* be available. (rc < cap)
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn lock_reserve(header: NonNull<Self>) {
        let header_ptr = header.as_ptr();
        unsafe {
            let mut segment_lock = (*header_ptr).reserved.lock();

            // This path assumes the slot has something available, otherwise the acquisition should
            // have been rejected.
            debug_assert!(*segment_lock < (*header_ptr).cap);

            *segment_lock += 1;
            if *segment_lock == (*header_ptr).cap {
                // This reservation exhausted the segment, move it to full.
                let inner_ptr = (*header_ptr).pool_inner.as_ptr();
                let mut lists_lock = (*inner_ptr).lists.lock();
                lists_lock.move_partial_to_full(header);
            }
        }
    }

    /// Returns a slot to the segment.
    ///
    /// # Safety
    ///
    /// `header` and `slot` must be valid to dereference, and `slot` must be allocated from `header`.
    #[inline]
    unsafe fn lock_dealloc_slot(header: NonNull<Self>, slot: NonNull<Slot<T>>) {
        // SAFETY: `inner_ptr` is valid to dereference, it lives as long as the pool.
        unsafe {
            let inner_ptr = (*header.as_ptr()).pool_inner.as_ptr();
            let _dealloc_guard = (*inner_ptr).stats.value.is_deallocating();

            Self::lock_push_partition(header, slot);
            Self::lock_release_unreserve(header);
        }
    }

    /// Attaches `slot` to an array partition in `header`. This effectively makes the slot
    /// allocatable again, so it should only be called when finished handling the slot.
    /// Slot must be allocated from the header.
    ///
    /// # Safety
    ///
    /// `header` and `slot` must be valid to dereference, and `slot` must be allocated from `header`.
    #[inline]
    unsafe fn lock_push_partition(header: NonNull<Self>, slot: NonNull<Slot<T>>) {
        let ptr = header.as_ptr();
        unsafe {
            let index = Self::natural_index(header, slot);
            let num_partitions = (*ptr).partitions.len();

            let (mut lock, index) = (0..num_partitions)
                .find_map(|offset| {
                    let index = (index + offset) % (*ptr).partitions.len();
                    (*ptr).partitions[index].value.try_lock().map(|lock| (lock, index))
                })
                .unwrap_or_else(|| ((*ptr).partitions[index].value.lock(), index));

            (*slot.as_ptr()).payload.next = *lock;
            *lock = Some(slot);
            (*ptr).partitions_bm.value.fetch_or(1u32 << index, Release);
        }
    }

    /// Releases a reservation on the segment.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn lock_release_unreserve(header: NonNull<Self>) {
        let ptr = header.as_ptr();
        // SAFETY: `header_ptr` is valid to dereference, so it is okay to grab `inner_ptr` and
        // dereference that too, because `PoolInner` lives as long as the pool.
        unsafe {
            let inner_ptr = (*ptr).pool_inner.as_ptr();
            let mut segment_lock = (*ptr).reserved.lock();

            debug_assert!(*segment_lock > 0);

            // If the segment is no longer full, move it off the full list.
            *segment_lock -= 1;
            if *segment_lock == (*ptr).cap - 1 {
                let mut lists_lock = (*inner_ptr).lists.lock();
                lists_lock.move_full_to_partial_tail(header);
            }

            // Reference release and opportunistic freeze attempt.
            if (*ptr).rc.value.fetch_sub(1, Release) == 1
                && (*ptr).rc.value.compare_exchange(0, Self::FROZEN, Acquire, Relaxed).is_ok()
            {
                let mut lists_lock = (*inner_ptr).lists.lock();

                // Frozen list requires no aliasing on its segments. Move the segment over and
                // release the lists lock when all reads/writes to the segment are done.
                drop(segment_lock);
                lists_lock.move_partial_to_frozen(header);
            }
        }
    }

    /// Returns the natural partition index of `slot`.
    /// The natural index is the partition that the slot will be assigned to, if it can be acquired.
    ///
    /// # Safety
    ///
    /// `header` and `slot` must be valid to dereference, and `slot` must be allocated from `header`.
    #[inline]
    unsafe fn natural_index(header: NonNull<Self>, slot: NonNull<Slot<T>>) -> usize {
        let header_ptr = header.as_ptr();
        let start_byte = header_ptr as *const _ as *const u8;
        let header_size = size_of::<Self>();

        // SAFETY: `Pool::new` asserts no padding between `header` and `slots` fields.
        unsafe {
            let array_start = start_byte.add(header_size).cast();
            let index = slot.as_ptr().offset_from(array_start);
            debug_assert!(index >= 0);
            index as usize % (*header_ptr).partitions.len()
        }
    }

    /// Resets a segment to pristine state.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference. It must be uniquely owned by the caller because it
    /// will bypass the lock and write directly to the memory.
    #[inline]
    unsafe fn reset(header: NonNull<Self>) {
        let header_ptr = header.as_ptr();
        // SAFETY: `header_ptr` is a valid pointer to allocated and initialized memory.
        // This thread has exclusive access to it for the duration of the call.
        unsafe {
            let reserved_ptr = *(*header_ptr).reserved.data_ptr();

            #[rustfmt::skip]
            debug_assert_eq!(reserved_ptr, 0, "Expected segment to be unreserved, has {} reservations", reserved_ptr);

            *(*header_ptr).partition_head.value.data_ptr() = None;
            let partitions_ptr = (*header_ptr).partitions.as_ptr();
            for i in 0..(*header_ptr).partitions.len() {
                let n_ptr = partitions_ptr.add(i);
                (*n_ptr).value.data_ptr().write(None);
            }
            (*header_ptr).bump_index.value.store(0, Relaxed);
            (*header_ptr).partitions_bm.value.store(0, Release);
        }
    }
} // impl SegmentHeader

/// Individual allocatable memory area within a segment.
struct Slot<T> {
    /// Pointer to the parent segment header.
    header: NonNull<SegmentHeader<T>>,
    /// User data.
    payload: SlotPayload<T>,
}

/// Union storing active user data when in allocated, or a pointer to the next free slot when the
/// slot is unallocated and linked to a segment.
union SlotPayload<T> {
    data: ManuallyDrop<T>,
    next: Option<NonNull<Slot<T>>>,
}

#[repr(C)]
struct PoolStats {
    /// Number of allocation operations in progress.
    in_flight_allocs: Pad<AtomicUsize>,
    /// Number of deallocation operations in progress.
    in_flight_deallocs: Pad<AtomicUsize>,
    /// Total heap byte size of **all** pool allocations. Includes segment memory and any internal
    /// structures such as `PoolInner`.
    allocated_bytes: Pad<AtomicUsize>,
}

impl PoolStats {
    /// Returns a new `PoolStats`.
    fn new() -> Self {
        PoolStats {
            in_flight_allocs: Pad::new(0.into()),
            in_flight_deallocs: Pad::new(0.into()),
            allocated_bytes: Pad::new(0.into()),
        }
    }

    /// Increments the allocating counter and returns a guard to decrement it on drop.
    fn is_allocating<'a>(&'a self) -> AtomicIncrementGuard<'a> {
        AtomicIncrementGuard::new(&self.in_flight_allocs.value)
    }

    /// Increments the deallocating counter and returns a guard to decrement it on drop.
    fn is_deallocating<'a>(&'a self) -> AtomicIncrementGuard<'a> {
        AtomicIncrementGuard::new(&self.in_flight_deallocs.value)
    }
}

/// Memory region containing a `SegmentHeader` and slot array.
#[repr(C)]
struct Segment<T, const CAP: usize> {
    header: SegmentHeader<T>,
    slots: [UnsafeCell<Slot<T>>; CAP],
}

impl<T, const CAP: usize> Segment<T, CAP> {
    /// Allocates a new segment on the heap. Header fields are initialized and each slot has a valid
    /// header pointer. The slot payloads are None and must be set on allocation.
    ///
    /// # Panics
    ///
    /// Panics when the global allocator fails to allocate memory.
    ///
    /// # Safety
    ///
    /// `inner` must be valid to dereference.
    unsafe fn new_on_heap(inner: NonNull<PoolInner<T>>) -> NonNull<Self> {
        let layout = Layout::new::<Self>();
        // SAFETY: This block allocates some memory and initializes it.
        // Remaining unsafety comes from pointer dereferences, but since this block allocates the
        // memory and checks it, it should be safe.
        unsafe {
            let header_ptr: *mut SegmentHeader<T> = alloc(layout).cast();
            if header_ptr.is_null() {
                handle_alloc_error(layout);
            }

            header_ptr.write(SegmentHeader::new(inner, CAP));

            let segment_ptr: *mut Segment<T, CAP> = header_ptr.cast();
            let slots_ptr = &raw mut (*segment_ptr).slots;
            let first_slot_ptr: *mut UnsafeCell<Slot<T>> = slots_ptr.cast();

            // The array might be very big, so initialize on the heap.
            let header_nn = NonNull::new_unchecked(header_ptr);
            for i in 0..CAP {
                let slot_ptr: *mut Slot<T> = first_slot_ptr.add(i).cast();
                (&raw mut (*slot_ptr).header).write(header_nn);
                (&raw mut (*slot_ptr).payload.next).write(None);
            }
            header_nn.cast()
        }
    }

    /// Allocates a reserved slot from the segment.
    ///
    /// # Safety
    ///
    /// `seg` must be valid to dereference.
    #[inline]
    fn alloc_reserved(seg: NonNull<Self>, value: T) -> NonNull<Slot<T>> {
        let ptr = seg.as_ptr();
        // SAFETY: `seg_ptr` is valid to dereference.
        // Segment memory is never deallocated while threads hold acquired references.
        unsafe {
            debug_assert!((*ptr).header.rc.value.load(Acquire) > 0);

            let bump_index = (*ptr).header.bump_index.value.fetch_add(1, Acquire);
            debug_assert_ne!(bump_index, u64::MAX);

            let slot = if bump_index < (CAP as u64) {
                let slot = (*ptr).slots[bump_index as usize].get();
                debug_assert!(!slot.is_null());
                // It is okay to make a `NonNull` here because the pointer is definitely non-null,
                // see safety comment above.
                NonNull::new_unchecked(slot)
            } else {
                Self::alloc_reserved_from_partition(seg)
            };

            (*slot.as_ptr()).payload.data = ManuallyDrop::new(value);
            slot
        }
    }

    /// Allocates a reserved slot from segment partitions.
    ///
    /// # Safety
    ///
    /// `seg` must be valid to dereference.
    #[inline]
    unsafe fn alloc_reserved_from_partition(seg: NonNull<Self>) -> NonNull<Slot<T>> {
        let ptr = seg.as_ptr();
        // SAFETY: `seg_ptr` is a valid pointer to allocated and initialized memory.
        // Segment memory is never deallocated while threads hold acquired references.
        unsafe {
            let mut partition_head_lock = {
                let mut partition_head_lock = (*ptr).header.partition_head.value.lock();
                if let Some(head) = *partition_head_lock {
                    *partition_head_lock = (*head.as_ptr()).payload.next;
                    return head;
                }
                partition_head_lock
            };

            // Steal a list into the partition head.
            let list = 'steal: loop {
                let mut map = (*ptr).header.partitions_bm.value.load(Acquire);
                debug_assert!(map != 0, "Bitmap must be >0 while holding lock");

                while map != 0 {
                    let index = map.trailing_zeros() as usize;
                    let mask = 1u32 << index;
                    map &= !mask;

                    if let Some(mut guard) = (*ptr).header.partitions[index].value.try_lock() {
                        let head = guard.take();
                        (*ptr).header.partitions_bm.value.fetch_and(!mask, Release);
                        if let Some(list) = head {
                            break 'steal list;
                        }
                    }
                }
            };

            // Keep the first slot for this thread and put the next one back in the partition head.
            *partition_head_lock = (*list.as_ptr()).payload.next;
            list
        }
    }
} // impl Segment

#[inline(always)]
fn snooze() {
    sleep(Duration::from_millis(1));
}

#[cfg(test)]
mod pool_tests {
    use super::*;

    #[test]
    #[rustfmt::skip]
    fn test_pool_segment_lifecycle() {
        let pool = ArrayPool::<u32, 4>::new(2);
        unsafe {
            let lists_ptr = (*pool.inner.as_ptr()).lists.data_ptr();

            // Returns the number of items in `list`.
            let count_list = |list: NonNull<Link>| -> usize {
                let mut count = 0;

                let ptr = list.as_ptr();
                let mut curr = *(*ptr).next.get();
                while curr != list {
                    count += 1;
                    curr = *(*curr.as_ptr()).next.get();
                }

                count
            };

            assert_eq!(count_list((*lists_ptr).partial), 2, "Expected 2 segments in partial");
            assert_eq!(count_list((*lists_ptr).full), 0, "Expected empty full list");
            assert_eq!(count_list((*lists_ptr).frozen), 0, "Expected empty frozen list");

            // The pool started with 2 segments and cap of 4, so 8 total slots.
            // Allocating 12 items means the pool will need to grow once, and then all 3
            // segments should be in the full list.
            let mut orcs = Vec::new();
            for i in 0..12 {
                let slot = pool.alloc(i as u32);
                orcs.push(slot);
            }

            assert_eq!(count_list((*lists_ptr).partial), 0, "Expected empty partial list after allocating");
            assert_eq!(count_list((*lists_ptr).full), 3, "Expected 3 segments in full list after allocating");

            drop(orcs);

            assert_eq!(count_list((*lists_ptr).partial), 0, "Expected empty partial list after deallocating");
            assert_eq!(count_list((*lists_ptr).full), 0, "Expected empty full list after deallocating");
            assert_eq!(count_list((*lists_ptr).frozen), 3, "Expected 3 segments in frozen after deallocating");

            // The partial list is empty, but the frozen list still contains some segments.
            // Allocating again should recycle a frozen segment instead of growing.
            let _orc = pool.alloc(999);

            assert_eq!(count_list((*lists_ptr).partial), 1, "Expected a segment to be recycled from frozen");
            assert_eq!(count_list((*lists_ptr).frozen), 2, "Expected a segment to be popped from frozen");
        }
    }

    #[test]
    fn test_link_init_and_empty() {
        unsafe {
            let mut link = Link::uninit();
            let list = NonNull::new_unchecked(&mut link as *mut Link);

            Link::init(list);
            // `init` should make it point to itself.
            assert!(Link::is_empty(list));
            assert_eq!(*link.next.get(), list);
            assert_eq!(*link.prev.get(), list);
        }
    }

    #[test]
    fn test_push_and_pop() {
        unsafe {
            let mut link = Link::uninit();
            let list = NonNull::new_unchecked(&mut link as *mut Link);
            Link::init(list);

            let mut l1 = Box::new(Link::uninit());
            let mut l2 = Box::new(Link::uninit());
            let n1 = NonNull::new_unchecked(&mut *l1 as *mut Link);
            let n2 = NonNull::new_unchecked(&mut *l2 as *mut Link);

            Link::push_head(list, n1);
            assert!(!Link::is_empty(list));
            Link::push_head(list, n2);
            // l2 should be the head.
            let popped1 = Link::pop_head(list);
            assert_eq!(popped1, Some(n2));
            // l1 should be next.
            let popped2 = Link::pop_head(list);
            assert_eq!(popped2, Some(n1));
            // Now it should be empty again.
            assert!(Link::is_empty(list));
            assert_eq!(Link::pop_head(list), None);
        }
    }

    #[test]
    fn test_list_management() {
        unsafe {
            let mut base1 = Link::uninit();
            let mut base2 = Link::uninit();
            let list1 = NonNull::new_unchecked(&mut base1 as *mut Link);
            let list2 = NonNull::new_unchecked(&mut base2 as *mut Link);
            Link::init(list1);
            Link::init(list2);

            let mut l1 = Box::new(Link::uninit());
            let mut l2 = Box::new(Link::uninit());
            let mut l3 = Box::new(Link::uninit());
            let n1 = NonNull::new_unchecked(&mut *l1 as *mut Link);
            let n2 = NonNull::new_unchecked(&mut *l2 as *mut Link);
            let n3 = NonNull::new_unchecked(&mut *l3 as *mut Link);

            // n3 should be the head, n2 the middle, n1 the tail.
            Link::push_head(list1, n1);
            Link::push_head(list1, n2);
            Link::push_head(list1, n3);

            // Head should not equal the tail because the list has more than one item.
            assert_eq!(*list1.as_ref().next.get(), n3);
            assert_eq!(*list1.as_ref().prev.get(), n1);

            Link::move_head(list2, n3);

            // An item was moved out of list1, but list1 should still have two items left in it.
            // Make sure everything still links together correctly.
            assert_eq!(*list1.as_ref().next.get(), n2);
            assert_eq!(*list1.as_ref().prev.get(), n1);

            assert_eq!(*n2.as_ref().prev.get(), list1);
            assert_eq!(*n1.as_ref().next.get(), list1);

            assert_eq!(*n2.as_ref().next.get(), n1);
            assert_eq!(*n1.as_ref().prev.get(), n2);

            assert_eq!(*list2.as_ref().next.get(), n3);
            assert_eq!(*list2.as_ref().prev.get(), n3);

            Link::move_tail(list2, n1);

            // Now list1 should have a single item.
            assert_eq!(*list1.as_ref().next.get(), n2);
            assert_eq!(*list1.as_ref().prev.get(), n2);
            assert_eq!(*n2.as_ref().next.get(), list1);
            assert_eq!(*n2.as_ref().prev.get(), list1);

            assert_eq!(*list2.as_ref().next.get(), n3);
            assert_eq!(*list2.as_ref().prev.get(), n1);
            assert_eq!(*n3.as_ref().next.get(), n1);
            assert_eq!(*n1.as_ref().prev.get(), n3);
        }
    }

    #[test]
    fn test_unlink() {
        unsafe {
            let mut link = Link::uninit();
            let list = NonNull::new_unchecked(&mut link as *mut Link);
            Link::init(list);

            let mut l1 = Box::new(Link::uninit());
            let n1 = NonNull::new_unchecked(&mut *l1 as *mut Link);

            Link::push_head(list, n1);
            assert!(!Link::is_empty(list));

            Link::unlink(n1);
            assert!(Link::is_empty(list));
        }
    }
}
