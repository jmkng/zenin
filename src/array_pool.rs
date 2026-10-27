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

use std::marker::PhantomData;
use std::ptr::NonNull;
use std::sync::atomic::AtomicUsize;

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

/// Inner pool data. Fields here are shared by allocated segments. Any additional subsystems needed
/// by the segments should go in here.
struct PoolInner<T> {
    lists: Spinlock<PoolLists<T>>,
    stats: PoolStats,
}

/// Manages the intrusive linked lists of segments that form the pool. Lists are categorized by
/// capacity state. Most lists here are LIFO stacks and do not need a tail pointer, but the partial
/// list needs one because it benefits from LRU rotation. "hot" segments go the tail and have more
/// time to "cool" before reaching the head.
struct PoolLists<T> {
    /// Head of the list containing partial segments, which have unreserved slots.
    partial_head: SegmentList<T>,
    /// Tail of the list containing partial segments, which have unreserved slots.
    partial_tail: SegmentList<T>,
    /// List containing full segments that cannot satisfy allocation requests.
    full: SegmentList<T>,
    /// List containing frozen segments that are completely unreferenced and unreserved. They can be
    /// popped from the list and deallocated by the lock holder, or pulled back to the partial list.
    frozen: SegmentList<T>,

    /// Number of allocated segments across all lists.
    num_segments: u32,
    /// Minimum segments to maintain. (Warm memory baseline)
    min_segments: u32,
}

/// Contains a list of segments, or None when the list is empty.
type SegmentList<T> = Option<NonNull<SegmentHeader<T>>>;

struct SegmentHeader<T> {
    partition_head: Pad<Spinlock<SlotList<T>>>,
}

type SlotList<T> = Option<NonNull<Slot<T>>>;

/// Individual allocatable memory area.
struct Slot<T> {
    header: NonNull<SegmentHeader<T>>,
    payload: SlotPayload<T>,
}

union SlotPayload<T> {
    _pd: PhantomData<T>,
}

/// Pool telemetry data.
struct PoolStats {
    /// Number of allocation operations in progress.
    in_flight_allocs: AtomicUsize,
    /// Number of deallocation operations in progress.
    in_flight_deallocs: AtomicUsize,
    /// Number of bytes allocated for slots across all pool segments. Does not track memory usage of
    /// any small miscellaneous one-time allocations made by the pool.
    resident_bytes: AtomicUsize,
}
