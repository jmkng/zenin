pub mod atomic {
    use std::sync::atomic::AtomicUsize;
    use std::sync::atomic::Ordering::Relaxed;

    /// RAII guard that increments an atomic counter upon creation and decrements it when dropped.
    /// This guard uses `Relaxed` ordering for all operations.
    pub struct AtomicIncrementGuard<'a> {
        counter: &'a AtomicUsize,
    }

    impl<'a> AtomicIncrementGuard<'a> {
        /// Returns a new guard, incrementing the counter.
        #[inline]
        pub fn new(counter: &'a AtomicUsize) -> Self {
            counter.fetch_add(1, Relaxed);
            Self { counter }
        }
    }

    impl<'a> Drop for AtomicIncrementGuard<'a> {
        #[inline]
        fn drop(&mut self) {
            self.counter.fetch_sub(1, Relaxed);
        }
    }
}
