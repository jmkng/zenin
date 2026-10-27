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
    /// Returns a new `Spinlock` wrapping `value`.
    pub fn new(value: T) -> Self {
        Self {
            is_locked: AtomicBool::new(false),
            inner: UnsafeCell::new(value),
        }
    }

    /// Locks the `Spinlock`, blocking the thread until it becomes available.
    /// Uses relaxed loads to spin and attempts CAS when it appears free.
    pub fn lock(&self) -> SpinlockGuard<'_, T> {
        loop {
            // TAS attempt.
            if self
                .is_locked
                .compare_exchange_weak(false, true, Acquire, Relaxed)
                .is_ok()
            {
                break;
            }
            // Spinning in read-only.
            while self.is_locked.load(Ordering::Relaxed) {
                spin_loop();
            }
        }

        SpinlockGuard { lock: self }
    }

    /// Attempts to lock the `Spinlock` without blocking.
    /// Returns None if the lock is currently held.
    pub fn try_lock(&self) -> Option<SpinlockGuard<'_, T>> {
        if !self.is_locked.swap(true, Acquire) {
            return Some(SpinlockGuard { lock: self });
        }
        None
    }

    /// Returns a mutable reference to the inner data, bypassing the lock.
    /// Useful for initialization of local data.
    pub fn get_mut(&mut self) -> &mut T {
        // SAFETY: This method needs `&mut self` so it should be okay to have `&mut T`.
        unsafe { &mut *self.inner.get() }
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
        self.lock.is_locked.store(false, Release);
    }
}
