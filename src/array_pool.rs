//! A concurrent memory pool for fixed-size objects.
//!
//! `ArrayPool` allocates arrays of `T` memory according to the compile-time specified `CAP`,
//! storing them in separate intrusive lists:
//!
//! - `Partial`: Segments containing at least one unreserved slot available for allocation.
//! - `Full`: Segments at 100% reserved capacity.
//! - `Frozen`: Segments that are unreferenced, awaiting either recycling back to the partial
//!    list or deallocation.
//!
//! # Allocation Protocol
//!
//! Allocating threads must first acquire the lists lock and increment the reference count of the
//! head of the partial list, after which the lists lock can be released and the thread may work
//! with the segment directly, which has its own synchronization.
//!
//! With an acquired segment, the `reserved` counter must be incremented to reserve a slot.
//! When reserved is already at `CAP`, release the reference and try again with a new segment.
//! The thread that reserves the last slot **must** acquire the lists lock and move the segment to
//! the full list. After a reservation has been made, the slot memory can be claimed.
//!
//! The user receives an `Orc` pointer associated with the reserved slot.
//!
//! # Deallocation Protocol
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
use std::thread::{sleep, yield_now};
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
        unsafe {
            inner_ptr.write(PoolInner::new(min));
            (*inner_ptr).stats.value.allocated_bytes.value = allocated_bytes;
            // (*inner_ptr).stats.allocated_bytes = allocated_bytes;

            let inner_nn = NonNull::new_unchecked(inner_ptr);
            let lists = (*inner_ptr).lists.get_mut();

            for _ in 0..min {
                let seg: NonNull<Segment<T, CAP>> = Segment::new_on_heap(inner_nn);
                lists.push_to_partial_head(seg.cast());
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
        // let _alloc_sig_guard = unsafe { (*self.inner.as_ptr()).stats.is_allocating() };

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

            // // Try to reserve a slot.
            // unsafe {
            //     if !SegmentHeader::lock_reserve(header) {
            //         // Another thread reserved the last slot already. Release the acquired reference
            //         // and try again.
            //         (*header_ptr).rc.fetch_sub(1, Release);
            //         continue 'retry;
            //     }
            // }

            // SAFETY: `header` is valid to dereference.
            // Segments are not deallocated until they hit the frozen list, or the pool drops.
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
            // let deallocs = (*stats_ptr).in_flight_deallocs.load(Relaxed);
            // let allocs = (*stats_ptr).in_flight_allocs.load(Relaxed);
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
            // (*stats_ptr).allocated_bytes.fetch_add(size_of::<Segment<T, CAP>>(), Relaxed);
            (*lists_ptr).lock().push_to_partial_head(seg.cast());

            // Now the new slots are in the pool, undo the mark.
            let mut grow_lock = self.grow_lock.lock();
            *grow_lock -= CAP;
            drop(grow_lock);
        }
    }

    pub fn lock_trim(&self) {
        // SAFETY: `inner` is valid to dereference.
        // The memory is not deallocated until the pool is dropped.
        let mut lists_lock = unsafe { (*self.inner.as_ptr()).lists.lock() };
        if lists_lock.num_segments <= lists_lock.min_segments {
            return;
        }
        let Some(frozen_ptr) = lists_lock.pop_frozen() else {
            return;
        };
        drop(lists_lock);

        // SAFETY: `frozen_ptr` was allocated using `alloc` with the same layout.
        unsafe { dealloc(frozen_ptr.as_ptr().cast(), Layout::new::<Segment<T, CAP>>()) };
    }
} // impl ArrayPool

impl<T, const CAP: usize> Drop for ArrayPool<T, CAP> {
    fn drop(&mut self) {
        let inner_ptr = self.inner.as_ptr();
        // SAFETY: `inner_ptr` is valid to dereference. It gets deallocated at the end.
        let (lists, stats) = unsafe { ((*inner_ptr).lists.get_mut(), &(*inner_ptr).stats) };

        debug_assert!(
            stats.value.in_flight_allocs.value.load(Relaxed) == 0
                && stats.value.in_flight_deallocs.value.load(Relaxed) == 0,
            "In flight operations must finish before deallocation"
        );
        debug_assert!(
            lists.full.is_none() && lists.partial_head.is_none() && lists.partial_tail.is_none(),
            "All slots must be returned before deallocation"
        );

        let layout = Layout::new::<Segment<T, CAP>>();
        let mut current = lists.frozen.take();
        while let Some(seg) = current {
            unsafe {
                current = *(*seg.as_ptr()).next.get();
                dealloc(seg.as_ptr() as *mut u8, layout);
            }
        }
        unsafe { dealloc(inner_ptr.cast(), Layout::new::<PoolInner<T>>()) };
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

impl<T> PoolInner<T> {
    /// Returns a new `PoolInner`.
    pub fn new(min: u32) -> Self {
        Self { lists: Sleeplock::new(Lists::new(min)), stats: Pad::new(PoolStats::new()) }
    }
}

/// Manages the intrusive linked lists of segments that form the pool. Lists are categorized by
/// capacity state. Most lists here are LIFO stacks and do not need a tail pointer, but the partial
/// list needs one because it benefits from LRU rotation. "hot" segments go the tail and have more
/// time to "cool" before reaching the head.
struct Lists<T> {
    partial_head: Option<NonNull<SegmentHeader<T>>>,
    partial_tail: Option<NonNull<SegmentHeader<T>>>,
    full: Option<NonNull<SegmentHeader<T>>>,
    frozen: Option<NonNull<SegmentHeader<T>>>,

    /// Number of allocated segments across all lists.
    num_segments: u32,
    /// Minimum segments to keep allocated.
    min_segments: u32,
}

/// The list is blocked by a frozen segment.
struct Blocked;

impl<T> Lists<T> {
    /// Returns a new `Lists`.
    pub fn new(min: u32) -> Self {
        Lists {
            partial_head: None,
            partial_tail: None,
            full: None,
            frozen: None,
            num_segments: 0,
            min_segments: min,
        }
    }
    // Returns an acquired reference to a partially filled segment, or None when no segments are
    // available for allocation. Returns an error if the list is blocked.
    #[inline]
    fn acquire_partial(&mut self) -> Result<Option<NonNull<SegmentHeader<T>>>, Blocked> {
        if let Some(header) = self.partial_head {
            let header_ptr = header.as_ptr();
            // SAFETY: `header_ptr` is valid to dereference.
            // The memory is not deallocated until the pool is dropped.
            unsafe {
                let rc_ptr = &raw mut (*header_ptr).rc;
                // if (*rc_ptr).fetch_add(1, Acquire) < 0 {
                //     // The segment is frozen and the freezer is on the way to the lock to clear it.
                //     (*rc_ptr).fetch_sub(1, Release);
                //     return Err(Blocked);
                // }
                let prev_rc = (*rc_ptr).value.fetch_add(1, Acquire);
                if prev_rc < 0 || prev_rc as usize >= (*header_ptr).cap {
                    // The segment is frozen and the freezer is on the way to clear it,
                    // *or* the segment is over-acquired and won't be able to serve the request. The
                    // thread that takes the last slot will move it.
                    (*rc_ptr).value.fetch_sub(1, Relaxed);
                    return Err(Blocked);
                }
            }
            return Ok(Some(header));
        }
        // Try to recycle a frozen segment.
        if let Some(header) = self.frozen {
            // SAFETY: `header` is valid to dereference. Segments on the frozen list are unreferenced
            // and this thread has exclusive access to them, so it can reset one and put it back in
            // the partial list.
            unsafe {
                SegmentHeader::reset(header);
                (*header.as_ptr()).rc.value.store(1, Release);
            }
            self.pop_frozen_to_partial_head();
            return Ok(Some(header));
        }

        Ok(None)
    }

    /// Attaches a segment to the partial list head and increments segment count.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn push_to_partial_head(&mut self, header: NonNull<SegmentHeader<T>>) {
        let header_ptr = header.as_ptr();
        // SAFETY: This thread has exclusive access to the lists.
        unsafe {
            *(*header_ptr).prev.get() = None;
            *(*header_ptr).next.get() = self.partial_head;
            if let Some(head) = self.partial_head {
                *(*head.as_ptr()).prev.get() = Some(header);
            } else {
                // Partial list is empty, so this segment also becomes the tail.
                self.partial_tail = Some(header);
            }
        }
        self.partial_head = Some(header);
        self.num_segments += 1;
    }

    /// Moves a segment in the partial list to the full list.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_partial_to_full(&mut self, header: NonNull<SegmentHeader<T>>) {
        let header_ptr = header.as_ptr();
        unsafe {
            let prev_seg = *(*header_ptr).prev.get();
            let next_seg = *(*header_ptr).next.get();

            // Detach from partial list.
            if let Some(prev) = prev_seg {
                *(*prev.as_ptr()).next.get() = next_seg;
            } else {
                self.partial_head = next_seg;
            }

            if let Some(next) = next_seg {
                *(*next.as_ptr()).prev.get() = prev_seg;
            } else {
                self.partial_tail = prev_seg;
            }

            // Attach to full list.
            *(*header_ptr).prev.get() = None;
            *(*header_ptr).next.get() = self.full;
            if let Some(head) = self.full {
                *(*head.as_ptr()).prev.get() = Some(header);
            }
            self.full = Some(header);
        }
    }

    /// Moves the frozen list head to the partial list.
    #[inline]
    fn pop_frozen_to_partial_head(&mut self) {
        let Some(head) = self.frozen else { return };
        let head_ptr = head.as_ptr();
        // SAFETY: This thread has exclusive access to the lists.
        unsafe {
            // Detach from frozen list.
            let next_seg = *(*head_ptr).next.get();
            self.frozen = next_seg;
            if let Some(header) = next_seg {
                *(*header.as_ptr()).prev.get() = None;
            }
            *(*head_ptr).next.get() = self.partial_head;
            *(*head_ptr).prev.get() = None;
            if let Some(header) = self.partial_head {
                *(*header.as_ptr()).prev.get() = Some(head);
            } else {
                // Partial list is empty, so this segment also becomes the tail.
                self.partial_tail = Some(head);
            }
            self.partial_head = Some(head);
        }
    }

    /// Moves a segment in the partial list to the frozen list.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_partial_to_frozen(&mut self, header: NonNull<SegmentHeader<T>>) {
        let header_ptr = header.as_ptr();
        unsafe {
            // Detach from partial list.
            let prev_seg = *(*header_ptr).prev.get();
            let next_seg = *(*header_ptr).next.get();
            if let Some(prev_seg) = prev_seg {
                *(*prev_seg.as_ptr()).next.get() = next_seg;
            } else {
                self.partial_head = next_seg;
            }
            if let Some(next_seg) = next_seg {
                *(*next_seg.as_ptr()).prev.get() = prev_seg;
            } else {
                self.partial_tail = prev_seg;
            }

            // Attach to frozen list.
            *(*header_ptr).prev.get() = None;
            *(*header_ptr).next.get() = self.frozen;
            if let Some(frozen_header) = self.frozen {
                *(*frozen_header.as_ptr()).prev.get() = Some(header);
            }
            self.frozen = Some(header);
        }
    }

    /// Moves a segment in the full list to the partial list tail.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn move_full_to_partial_tail(&mut self, header: NonNull<SegmentHeader<T>>) {
        let header_ptr = header.as_ptr();
        unsafe {
            // Detach from full list.
            let prev_seg = *(*header_ptr).prev.get();
            let next_seg = *(*header_ptr).next.get();
            if let Some(prev_head) = prev_seg {
                *(*prev_head.as_ptr()).next.get() = next_seg;
            } else {
                self.full = next_seg;
            }
            if let Some(next_head) = next_seg {
                *(*next_head.as_ptr()).prev.get() = prev_seg;
            }

            // Attach to partial tail.
            *(*header_ptr).next.get() = None;
            *(*header_ptr).prev.get() = self.partial_tail;
            if let Some(tail) = self.partial_tail {
                *(*tail.as_ptr()).next.get() = Some(header);
            } else {
                // Partial list is empty, so this segment also becomes the head.
                self.partial_head = Some(header);
            }
            self.partial_tail = Some(header);
        }
    }

    /// Pops a segment from the frozen list head and decrements segment count.
    #[inline]
    fn pop_frozen(&mut self) -> Option<NonNull<SegmentHeader<T>>> {
        let head = self.frozen?;
        let head_ptr = head.as_ptr();
        unsafe {
            // Detach from frozen list.
            let next_seg = *(*head_ptr).next.get();
            self.frozen = next_seg;
            if let Some(header) = next_seg {
                *(*header.as_ptr()).prev.get() = None;
            }

            *(*head_ptr).next.get() = None;
            *(*head_ptr).prev.get() = None;
        }
        self.num_segments -= 1;
        Some(head)
    }
} // impl Lists

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
    prev: UnsafeCell<Option<NonNull<SegmentHeader<T>>>>,
    next: UnsafeCell<Option<NonNull<SegmentHeader<T>>>>,
}

impl<T> SegmentHeader<T> {
    /// Frozen segment sentinel value.
    const FROZEN: i32 = i32::MIN;

    /// Returns a new `SegmentHeader`.
    pub fn new(inner: NonNull<PoolInner<T>>, cap: usize) -> Self {
        SegmentHeader {
            partition_head: Pad::new(Sleeplock::new(None)),
            partitions: array::from_fn(|_| Pad::new(Sleeplock::new(None))),
            pool_inner: inner,
            cap,
            rc: Pad::new(0.into()),
            bump_index: Pad::new(0.into()),
            reserved: Sleeplock::new(0),
            prev: None.into(),
            next: None.into(),
            partitions_bm: Pad::new(0.into()),
        }
    }

    /// Reserves a slot in the segment by incrementing the reservation counter.
    /// Assumes a slot *can* be available. (rc < cap)
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn lock_reserve(header: NonNull<Self>) /* -> bool */
    {
        let header_ptr = header.as_ptr();
        unsafe {
            let mut segment_lock = (*header_ptr).reserved.lock();
            // This path assumes the slot has something available, otherwise the acquisition should
            // have been rejected.
            debug_assert!(*segment_lock < (*header_ptr).cap); // <-- THIS DEBUG ASSERTION FAILS
            // if *segment_lock == (*header_ptr).cap {
            //     // Segment has no capacity.
            //     return false;
            // }
            *segment_lock += 1;
            if *segment_lock == (*header_ptr).cap {
                // This reservation exhausted the segment, so it must be moved to the full list.
                let inner_ptr = (*header_ptr).pool_inner.as_ptr();
                (*inner_ptr).lists.lock().move_partial_to_full(header);
            }
        }
        // true
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

    /// Attaches `slot` to an array partition. This effectively makes the slot allocatable again,
    /// so it should only be called when finished handling the slot. Slot must be allocated from
    /// the header.
    ///
    /// # Safety
    ///
    /// `header` and `slot` must be valid to dereference, and `slot` must be allocated from `header`.
    #[inline]
    unsafe fn lock_push_partition(header: NonNull<Self>, slot: NonNull<Slot<T>>) {
        let header_ptr = header.as_ptr();
        unsafe {
            let index = Self::natural_index(header, slot);
            let (mut lock, index) = (0..(*header_ptr).partitions.len())
                .find_map(|offset| {
                    let index = (index + offset) % (*header_ptr).partitions.len();
                    (*header_ptr).partitions[index].value.try_lock().map(|lock| (lock, index))
                })
                .unwrap_or_else(|| ((*header_ptr).partitions[index].value.lock(), index));

            (*slot.as_ptr()).payload.next = *lock;
            *lock = Some(slot);
            (*header_ptr).partitions_bm.value.fetch_or(1u32 << index, Release);
        }
    }

    /// Releases a reservation on the segment.
    ///
    /// # Safety
    ///
    /// `header` must be valid to dereference.
    #[inline]
    unsafe fn lock_release_unreserve(header: NonNull<Self>) {
        let header_ptr = header.as_ptr();
        // SAFETY: `header_ptr` is valid to dereference, so it is okay to grab `inner_ptr` and
        // dereference that too, because `PoolInner` lives as long as the pool.
        unsafe {
            let inner_ptr = (*header_ptr).pool_inner.as_ptr();
            let mut segment_lock = (*header_ptr).reserved.lock();
            debug_assert!(*segment_lock > 0);
            // If the segment is no longer full, move it off the full list.
            *segment_lock -= 1;
            if *segment_lock == (*header_ptr).cap - 1 {
                let mut lists_lock = (*inner_ptr).lists.lock();
                lists_lock.move_full_to_partial_tail(header);
            }

            // Reference release and opportunistic freeze attempt.
            if (*header_ptr).rc.value.fetch_sub(1, Release) == 1 {
                if (*header_ptr)
                    .rc
                    .value
                    .compare_exchange(0, Self::FROZEN, Acquire, Relaxed)
                    .is_ok()
                {
                    let mut lists_lock = (*inner_ptr).lists.lock();
                    // Frozen list requires no aliasing on its segments. Move the segment over and
                    // release the lists lock when all reads/writes to the segment are done.

                    drop(segment_lock);
                    lists_lock.move_partial_to_frozen(header);
                }
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
    /// Total heap footprint of **all** pool allocations. Includes segment memory and any internal
    /// structures such as `PoolInner`.
    allocated_bytes: Pad<AtomicUsize>,
}

impl PoolStats {
    /// Returns a new `PoolStats`.
    pub fn new() -> Self {
        PoolStats {
            in_flight_allocs: Pad::new(0.into()),
            in_flight_deallocs: Pad::new(0.into()),
            allocated_bytes: Pad::new(0.into()),
        }
    }

    pub fn is_allocating<'a>(&'a self) -> AtomicIncrementGuard<'a> {
        AtomicIncrementGuard::new(&self.in_flight_allocs.value)
    }

    pub fn is_deallocating<'a>(&'a self) -> AtomicIncrementGuard<'a> {
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
    pub unsafe fn new_on_heap(inner: NonNull<PoolInner<T>>) -> NonNull<Self> {
        let layout = Layout::new::<Self>();

        // SAFETY: This block allocates some memory and initializes it.
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
        let seg_ptr = seg.as_ptr();
        // SAFETY: `seg_ptr` is valid to dereference.
        // Segment memory is never deallocated while threads hold acquired references.
        unsafe {
            debug_assert!((*seg_ptr).header.rc.value.load(Acquire) > 0);

            let bump_index = (*seg_ptr).header.bump_index.value.fetch_add(1, Acquire);
            debug_assert_ne!(bump_index, u64::MAX);

            let slot = if bump_index < (CAP as u64) {
                let slot = (*seg_ptr).slots[bump_index as usize].get();
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
        let seg_ptr = seg.as_ptr();
        // SAFETY: `seg_ptr` is a valid pointer to allocated and initialized memory.
        // Segment memory is never deallocated while threads hold acquired references.
        unsafe {
            let mut partition_head_lock = {
                let mut partition_head_lock = (*seg_ptr).header.partition_head.value.lock();
                if let Some(head) = *partition_head_lock {
                    *partition_head_lock = (*head.as_ptr()).payload.next;
                    return head;
                }
                partition_head_lock
            };

            // Steal a list into the partition head.
            let list = 'steal: loop {
                let mut map = (*seg_ptr).header.partitions_bm.value.load(Acquire);
                debug_assert!(map != 0, "Bitmap must be >0 while holding lock");

                while map != 0 {
                    let index = map.trailing_zeros() as usize;
                    let mask = 1u32 << index;
                    map &= !mask;

                    if let Some(mut guard) = (*seg_ptr).header.partitions[index].value.try_lock() {
                        let head = guard.take();
                        (*seg_ptr).header.partitions_bm.value.fetch_and(!mask, Release);
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

#[inline]
fn snooze() {
    yield_now();
    sleep(Duration::from_nanos(1));
}

#[cfg(test)]
mod pool_tests {
    use super::*;

    // #[test]
    // fn test_pool_grow() {
    //     let p1 = ArrayPool::<u8, 2>::new(1);
    //     let lists = unsafe { &raw mut (*p1.inner.as_ptr()).lists };
    //
    //     unsafe {
    //         assert_eq!((*lists).get_mut().num_segments, 1);
    //
    //         let v1 = p1.alloc(42);
    //         let v2 = p1.alloc(43);
    //
    //         // This segment is full and shouldn't be on the partial list anymore.
    //         assert!((*lists).get_mut().partial_head.is_none());
    //
    //         // This should allocate a new segment.
    //         let v3 = p1.alloc(99);
    //
    //         assert_eq!((*lists).get_mut().num_segments, 2);
    //
    //         // Newly allocated segment should be alone on the partial list.
    //         let head = (*lists).get_mut().partial_head;
    //         let tail = (*lists).get_mut().partial_tail;
    //         assert!(head.is_some());
    //         assert!(tail.is_some());
    //         assert_eq!(head, tail);
    //         assert!((*(*lists).get_mut().partial_head.unwrap().as_ptr()).next.get_mut().is_none());
    //
    //         drop(v1);
    //         drop(v2);
    //         drop(v3);
    //     }
    // }

    #[test]
    fn test_pool_thread_alloc() {
        use std::sync::Arc;
        use std::thread;

        let pool = Arc::new(ArrayPool::<usize, 4>::new(16));
        let mut handles = vec![];

        for _ in 0..8 {
            let pool_clone = Arc::clone(&pool);

            handles.push(thread::spawn(move || {
                let mut orcs = Vec::with_capacity(100);
                for _ in 0..100 {
                    let mut slot = pool_clone.alloc(42);
                    *slot = 1;
                    orcs.push(slot);
                }
                for peon in orcs.iter_mut() {
                    **peon *= 2;
                }
                // Orcs drop...
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }
}
