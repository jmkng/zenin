use std::cell::UnsafeCell;
use std::hint::spin_loop;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::Ordering::{Acquire, Relaxed, Release};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::sleep;
use std::time::Duration;

/// TATAS Spinlock. This implementation will actually spin, maybe see `Sleeplock` also.
#[derive(Debug)]
pub struct Spinlock<T> {
    is_locked: AtomicBool,
    inner: UnsafeCell<T>,
}

/// Guard type that releases the lock.
pub struct SpinlockGuard<'a, T> {
    lock: &'a Spinlock<T>,
}

unsafe impl<T: Send> Sync for Spinlock<T> {}
unsafe impl<T: Send> Send for Spinlock<T> {}

impl<T> Spinlock<T> {
    /// Returns a new unlocked `Spinlock` wrapping `value`.
    pub fn new(value: T) -> Self {
        Self { is_locked: AtomicBool::new(false), inner: UnsafeCell::new(value) }
    }

    /// Acquires the lock, spinning until it is ready.
    /// Returns a guard that grants mutable access to the protected data, and releases the lock when
    /// dropped.
    #[inline]
    pub fn lock(&self) -> SpinlockGuard<'_, T> {
        loop {
            // Spinning in read-only.
            while self.is_locked.load(Ordering::Relaxed) {
                spin_loop();
            }
            // TAS attempt.
            if self.is_locked.compare_exchange_weak(false, true, Acquire, Relaxed).is_ok() {
                break;
            }
        }

        SpinlockGuard { lock: self }
    }

    /// Attempts to acquire the lock without spinning. Returns None if the lock is already held.
    #[inline]
    pub fn try_lock(&self) -> Option<SpinlockGuard<'_, T>> {
        if !self.is_locked.load(Ordering::Relaxed) && !self.is_locked.swap(true, Ordering::Acquire)
        {
            return Some(SpinlockGuard { lock: self });
        }
        None
    }

    /// Returns a mutable reference to the protected data without acquiring the lock.
    /// Useful for initialization of local data.
    #[inline]
    pub fn get_mut(&mut self) -> &mut T {
        // SAFETY: This method needs `&mut self` so it should be okay to have `&mut T`.
        unsafe { &mut *self.inner.get() }
    }

    #[inline]
    pub fn data_ptr(&self) -> *mut T {
        self.inner.get()
    }

    /// Unlocks the `Spinlock` directly.
    ///
    /// # Safety
    ///
    /// Must only be called by the thread that currently holds the acquired lock.
    #[inline]
    pub unsafe fn unlock(&self) {
        self.is_locked.store(false, Release);
    }
}

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
        // SAFETY: This thread must have acquired the lock to have a guard.
        unsafe { self.lock.unlock() };
    }
}

/// Similar to `Spinlock` but with exponential sleeping between rapid acquisition attempts.
#[derive(Debug)]
pub struct Sleeplock<T> {
    is_locked: AtomicBool,
    inner: UnsafeCell<T>,
}

/// Guard type that releases the lock.
pub struct SleeplockGuard<'a, T> {
    lock: &'a Sleeplock<T>,
}

unsafe impl<T: Send> Sync for Sleeplock<T> {}
unsafe impl<T: Send> Send for Sleeplock<T> {}

impl<T> Sleeplock<T> {
    /// Returns a new unlocked `Sleeplock` wrapping `value`.
    pub fn new(value: T) -> Self {
        Self { is_locked: AtomicBool::new(false), inner: UnsafeCell::new(value) }
    }

    /// Acquires the lock, backing off to sleep as necessary.
    /// Returns a guard that grants mutable access to the protected data, and releases the lock when
    /// dropped.
    #[inline]
    pub fn lock(&self) -> SleeplockGuard<'_, T> {
        let mut usec = 1u64;
        const MAX_USEC: u64 = 512;

        loop {
            if !self.is_locked.load(Ordering::Relaxed)
                && self
                    .is_locked
                    .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
                    .is_ok()
            {
                break;
            }
            // Sleep.
            sleep(Duration::from_micros(usec));
            if usec < MAX_USEC {
                usec *= 2;
            }
        }

        SleeplockGuard { lock: self }
    }

    /// Attempts to acquire the lock without sleeping. Returns None if the lock is already held.
    #[inline]
    pub fn try_lock(&self) -> Option<SleeplockGuard<'_, T>> {
        if !self.is_locked.load(Ordering::Relaxed)
            && self
                .is_locked
                .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
                .is_ok()
        {
            return Some(SleeplockGuard { lock: self });
        }

        None
    }

    /// Returns a mutable reference to the protected data without acquiring the lock.
    /// Useful for initialization of local data.
    #[inline]
    pub fn get_mut(&mut self) -> &mut T {
        // SAFETY: This method needs `&mut self` so it should be okay to have `&mut T`.
        unsafe { &mut *self.inner.get() }
    }

    #[inline]
    pub fn data_ptr(&self) -> *mut T {
        self.inner.get()
    }

    /// Unlocks the `Sleeplock` directly.
    ///
    /// # Safety
    ///
    /// Must only be called by the thread that currently holds the acquired lock.
    #[inline]
    pub unsafe fn unlock(&self) {
        self.is_locked.store(false, Release);
    }
}

impl<T> Deref for SleeplockGuard<'_, T> {
    type Target = T;
    fn deref(&self) -> &T {
        unsafe { &*self.lock.inner.get() }
    }
}

impl<T> DerefMut for SleeplockGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        unsafe { &mut *self.lock.inner.get() }
    }
}

impl<T> Drop for SleeplockGuard<'_, T> {
    fn drop(&mut self) {
        // SAFETY: This thread must have acquired the lock to have a guard.
        unsafe { self.lock.unlock() };
    }
}
