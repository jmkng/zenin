//! A concurrent memory pool for fixed-size objects.
//!
//! Lock protocol in `ArrayPool` is:
//!
//!     `Partition Head -> Partition -> Segment -> Grow -> Pool`.
//!
//! Avoid nested locking outside of this order.

#![allow(warnings)]

// TODO
//     - Different name for Segment (region?)
//     -

use std::alloc::{Layout, alloc, dealloc, handle_alloc_error};
use std::array;
use std::cell::UnsafeCell;
use std::marker::PhantomData;
use std::mem::{ManuallyDrop, offset_of};
use std::process::abort;
use std::ptr::NonNull;
use std::sync::atomic::Ordering::Relaxed;
use std::sync::atomic::{AtomicU32, AtomicUsize};

use crate::cache_padded::Pad;
use crate::spin::Spinlock;

/// A concurrent memory pool for fixed-size objects.
pub struct ArrayPool<T, const CAP: usize> {
    /// Inner pool data. Segments allocated by the pool will update some pool-wide shared data, so
    /// they need to store pointers. This is a stable address for that data.
    inner: NonNull<PoolInner<T>>,
    /// No segments will maintain pointers to this field, it is only used by the pool itself.
    grow_lock: Spinlock<()>,
}

impl<T, const CAP: usize> ArrayPool<T, CAP> {
    const INNER_LAYOUT: Layout = Layout::new::<PoolInner<T>>();

    /// Returns a new `ArrayPool` with `min` segments allocated and ready to use.
    /// Each segment contains `CAP` number of elements.
    pub fn new(min: usize) -> Self {
        const { Self::assert_invariants() };

        let resident_bytes =
            AtomicUsize::new(size_of::<Slot<T>>().saturating_mul(CAP).saturating_mul(min));

        let inner = unsafe {
            let inner_ptr: *mut PoolInner<T> = alloc(Self::INNER_LAYOUT).cast();
            if inner_ptr.is_null() {
                handle_alloc_error(Self::INNER_LAYOUT);
            }

            inner_ptr.write(PoolInner {
                lists: Spinlock::new(Lists {
                    partial_head: None,
                    partial_tail: None,
                    full: None,
                    frozen: None,
                    num_segments: 0,
                    min_segments: 0,
                }),
                stats: PoolStats {
                    in_flight_allocs: 0.into(),
                    in_flight_deallocs: 0.into(),
                    resident_bytes,
                },
            });
            let inner_nn = NonNull::new_unchecked(inner_ptr);

            let lists = (*inner_ptr).lists.get_mut();
            for _ in 0..min {
                let seg: NonNull<Segment<T, CAP>> = Segment::new_on_heap(inner_nn);
                (*seg.as_ptr()).header.prev = None;
                (*seg.as_ptr()).header.next = lists.partial_head;
                if let Some(head) = lists.partial_head {
                    (*head.as_ptr()).prev = Some(seg.cast());
                }
                lists.partial_head = Some(seg.cast());
                lists.num_segments += 1;
            }

            inner_nn
        };

        let grow_lock = Spinlock::new(());
        Self { inner, grow_lock }
    }

    /// Assert:
    ///     1. no padding between `header` and `slots`,
    ///     2. `CAP` must be >= 2. Really CAP should be much larger for this memory pool to be
    ///        useful, but at least two or the segment lifecycle will break.
    #[rustfmt::skip]
    const fn assert_invariants() {
        assert!(Segment::<T, CAP>::SLOTS_OFFSET == size_of::<SegmentHeader<T>>(), "Invalid segment header layout");
        assert!(CAP >= 2, "Pool cap must be >= 2");
    }
}

impl<T, const CAP: usize> Drop for ArrayPool<T, CAP> {
    #[rustfmt::skip]
    fn drop(&mut self) {
        let (lists, stats) = unsafe {
            (
                (*self.inner.as_ptr()).lists.get_mut(),
                &(*self.inner.as_ptr()).stats,
            )
        };

        debug_assert_eq!(stats.in_flight_deallocs.load(Relaxed), 0, "In flight operations must finish before deallocation");
        debug_assert_eq!(stats.in_flight_deallocs.load(Relaxed), 0, "In flight operations must finish before deallocation");
        debug_assert!(lists.full.is_none(), "All slots should be returned before deallocation");

        let layout = Layout::new::<Segment<T, CAP>>();

        let dealloc_list = |head: &mut Option<NonNull<SegmentHeader<T>>>| {
            let mut current = head.take();
            while let Some(seg) = current {
                unsafe {
                    current = (*seg.as_ptr()).next;
                    dealloc(seg.as_ptr() as *mut u8, layout);
                }
            }
        };
        dealloc_list(&mut lists.partial_head);
        dealloc_list(&mut lists.frozen);
        unsafe { dealloc(self.inner.as_ptr().cast(), Self::INNER_LAYOUT) };
    }
}

/// Shared pool data.
struct PoolInner<T> {
    lists: Spinlock<Lists<T>>,
    stats: PoolStats,
}

/// Manages the intrusive linked lists of segments that form the pool. Lists are categorized by
/// capacity state. Most lists here are LIFO stacks and do not need a tail pointer, but the partial
/// list needs one because it benefits from LRU rotation. "hot" segments go the tail and have more
/// time to "cool" before reaching the head.
struct Lists<T> {
    /// Head of the list containing partial segments, which have unreserved slots.
    partial_head: Option<NonNull<SegmentHeader<T>>>,
    /// Tail of the list containing partial segments, which have unreserved slots.
    partial_tail: Option<NonNull<SegmentHeader<T>>>,
    /// List containing full segments that cannot satisfy allocation requests.
    full: Option<NonNull<SegmentHeader<T>>>,
    /// List containing frozen segments that are completely unreferenced and unreserved. They can be
    /// popped from the list and deallocated by the lock holder, or pulled back to the partial list.
    frozen: Option<NonNull<SegmentHeader<T>>>,

    /// Number of allocated segments across all lists.
    num_segments: u32,
    /// Minimum segments to maintain. (Warm memory baseline)
    min_segments: u32,
}

/// Header memory region for `Segment`.
/// Contains the state needed to manage an array of allocatable slots.
struct SegmentHeader<T> {
    /// Primary partition for allocators.
    partition_head: Pad<Spinlock<Option<NonNull<Slot<T>>>>>,
    /// Sharded partitions for deallocators. Reserved slots are returned to partitions here, and
    /// allocating threads lock a partition (using `partitions_bm` as a hint) to steal the list back
    /// to `partition_head` as needed.
    partitions: [Pad<Spinlock<Option<NonNull<Slot<T>>>>>; 4],

    /// Pointer to shared pool data.
    pool_inner: NonNull<PoolInner<T>>,

    /// Slot capacity of this segment. Runtime copy of `ArrayPool::CAP`.
    cap: usize,
    /// Reference count tracking the number of threads holding pointers to this segment.
    rc: AtomicUsize,
    /// Index tracking bump-allocation boundary. Used during initial "fast" phase of slot
    /// allocation. When exhausted, allocations come from `partition_head`.
    bump_index: AtomicUsize,

    /// Number of slots reserved for allocation. It must be incremented on allocation and
    /// decremented *after* a slot is linked back to a partition.
    /// When the segment is full `(reserved == cap)` it must be moved from partial to full.
    reserved: Spinlock<usize>,

    // Intrusive links to other segments. Accessed by the holder of the pool lists lock.
    prev: Option<NonNull<SegmentHeader<T>>>,
    next: Option<NonNull<SegmentHeader<T>>>,

    /// Bitmap state for `partitions`. The `partitions.len()` least significant bits are used to
    /// track availability of the partitions. Bits read 0 when they are empty. Readable lock-free.
    partitions_bm: AtomicU32,
}

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

struct PoolStats {
    /// Number of allocation operations in progress.
    in_flight_allocs: AtomicUsize,
    /// Number of deallocation operations in progress.
    in_flight_deallocs: AtomicUsize,
    /// Number of bytes allocated for slots across all pool segments.
    resident_bytes: AtomicUsize,
}

/// Memory region containing a `SegmentHeader` and slot array.
#[repr(C)]
struct Segment<T, const CAP: usize> {
    header: SegmentHeader<T>,
    slots: [UnsafeCell<Slot<T>>; CAP],
}

impl<T, const CAP: usize> Segment<T, CAP> {
    const SLOTS_OFFSET: usize = offset_of!(Self, slots);

    /// Allocates a new segment on the heap. Header fields are initialized and each slot has a valid
    /// header pointer. The slot payloads are None and must be set on allocation.
    ///
    /// # Panics
    ///
    /// Panics when the global allocator fails to allocate memory.
    pub fn new_on_heap(inner: NonNull<PoolInner<T>>) -> NonNull<Self> {
        let layout = Layout::new::<Self>();
        unsafe {
            let header_ptr: *mut SegmentHeader<T> = alloc(layout).cast();
            if header_ptr.is_null() {
                handle_alloc_error(layout);
            }
            let header_nn = NonNull::new_unchecked(header_ptr);

            header_ptr.write(SegmentHeader {
                partition_head: Pad::new(Spinlock::new(None)),
                partitions: array::from_fn(|_| Pad::new(Spinlock::new(None))),
                pool_inner: inner,
                cap: CAP,
                rc: 0.into(),
                bump_index: 0.into(),
                reserved: Spinlock::new(0),
                prev: None,
                next: None,
                partitions_bm: 0.into(),
            });

            let segment_ptr: *mut Segment<T, CAP> = header_ptr.cast();
            let first_slot_ptr: *mut UnsafeCell<Slot<T>> = (&raw mut (*segment_ptr).slots).cast();

            // The array might be very big, so initialize on the heap.
            for i in 0..CAP {
                let slot_ptr: *mut Slot<T> = first_slot_ptr.add(i).cast();
                (&raw mut (*slot_ptr).header).write(header_nn);
                (&raw mut (*slot_ptr).payload.next).write(None);
            }
            header_nn.cast()
        }
    }
}

#[cfg(test)]
mod pool_tests {
    use super::*;

    #[test]
    fn it_works() {
        let pool = ArrayPool::<u8, 1024>::new(0);
    }
}
