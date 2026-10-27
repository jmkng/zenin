use std::cell::UnsafeCell;
use std::hint::spin_loop;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::Ordering::{Acquire, Relaxed, Release};
use std::sync::atomic::{AtomicBool, Ordering};

/// TATAS Spinlock.
#[derive(Debug)]
pub struct Spinlock<T> {
    is_locked: AtomicBool,
    inner: UnsafeCell<T>,
}

unsafe impl<T: Send> Sync for Spinlock<T> {}
unsafe impl<T: Send> Send for Spinlock<T> {}

/// Guard type that releases the lock.
pub struct SpinlockGuard<'a, T> {
    lock: &'a Spinlock<T>,
}

impl<T> Spinlock<T> {
    /// Returns a new unlocked `Spinlock` wrapping `value`.
    pub fn new(value: T) -> Self {
        Self {
            is_locked: AtomicBool::new(false),
            inner: UnsafeCell::new(value),
        }
    }

    /// Acquires the lock, spinning until it is ready.
    /// Returns a guard that grants mutable access to the protected data, and releases the lock when
    /// dropped.
    pub fn lock(&self) -> SpinlockGuard<'_, T> {
        loop {
            // Spinning in read-only.
            while self.is_locked.load(Ordering::Relaxed) {
                spin_loop();
            }
            // TAS attempt.
            if self
                .is_locked
                .compare_exchange_weak(false, true, Acquire, Relaxed)
                .is_ok()
            {
                break;
            }
        }

        SpinlockGuard { lock: self }
    }

    /// Attempts to acquire the lock without spinning. Returns None if the lock is already held.
    pub fn try_lock(&self) -> Option<SpinlockGuard<'_, T>> {
        if !self.is_locked.swap(true, Acquire) {
            return Some(SpinlockGuard { lock: self });
        }
        None
    }

    /// Returns a mutable reference to the protected data without acquiring the lock.
    /// Useful for initialization of local data.
    pub fn get_mut(&mut self) -> &mut T {
        // SAFETY: This method needs `&mut self` so it should be okay to have `&mut T`.
        unsafe { &mut *self.inner.get() }
    }

    /// Unlocks the `Spinlock` directly.
    ///
    /// # Safety
    ///
    /// Must only be called by the thread that currently holds the acquired lock.
    pub(crate) unsafe fn unlock(&self) {
        self.is_locked.store(false, Release);
    }
}

// *** Impls ***

impl<T> Deref for SpinlockGuard<'_, T> {
    type Target = T;
    fn deref(&self) -> &T {
        unsafe { &*self.lock.inner.get() }
    }
}

impl<T> DerefMut for SpinlockGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        unsafe { &mut *self.lock.inner.get() }
    }
}

impl<T> Drop for SpinlockGuard<'_, T> {
    fn drop(&mut self) {
        // SAFETY: Caller owns the guard, so they must own the lock.
        unsafe { self.lock.unlock() };
    }
}

// *** Tests ****

#[cfg(test)]
mod spinlock_tests {
    use super::*;

    #[test]
    fn test_spinlock_get_mut() {
        let mut lock = Spinlock::new(42);
        let value_ref = lock.get_mut();
        *value_ref += 10;
        assert_eq!(*lock.get_mut(), 52);
    }

    #[test]
    fn test_spinlock_serial_locking() {
        use std::sync::Arc;
        use std::thread;

        let lock = Arc::new(Spinlock::new(0));
        let mut handles = vec![];

        for _ in 0..20 {
            let lock_clone = Arc::clone(&lock);
            let handle = thread::spawn(move || {
                for _ in 0..1000 {
                    let mut guard = lock_clone.lock();
                    *guard += 1;
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
        let value = lock.lock();
        assert_eq!(*value, 20_000);
    }

    #[test]
    fn test_spinlock_concurrent() {
        use std::sync::Arc;
        use std::thread;

        let lock = Arc::new(Spinlock::new(vec![0; 10]));
        let t1 = {
            let lock = Arc::clone(&lock);
            thread::spawn(move || {
                let mut guard = lock.lock();
                guard[0] = 1;
            })
        };

        let t2 = {
            let lock = Arc::clone(&lock);
            thread::spawn(move || {
                let mut guard = lock.lock();
                guard[1] = 2;
            })
        };

        t1.join().unwrap();
        t2.join().unwrap();
        let guard = lock.lock();
        assert_eq!(guard[0], 1);
        assert_eq!(guard[1], 2);
    }
}
