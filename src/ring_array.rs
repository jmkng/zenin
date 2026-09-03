#[derive(Debug)]
pub struct Ring<T> {
    data: Box<[T]>,
}

impl<T: Default + Copy> Ring<T> {
    /// Returns a new ring with allocated capacity of `cap`.
    /// Asserts `cap > 0`.
    pub fn new(cap: usize) -> Self {
        assert!(cap > 0);
        assert!(cap.is_power_of_two(), "Ring cap must be pow2 (got {cap})");

        Ring {
            data: vec![T::default(); cap].into_boxed_slice(),
        }
    }

    #[inline]
    pub fn oldest(&self, head: usize, len: usize) -> Option<T> {
        if len == 0 {
            None
        } else if len < self.cap() {
            Some(self.data[0])
        } else {
            Some(self.data[head])
        }
    }

    #[inline]
    pub fn newest(&self, head: usize, len: usize) -> Option<T> {
        if len == 0 {
            None
        } else {
            let mask = self.cap() - 1;
            let index = head.wrapping_sub(1) & mask;
            Some(self.data[index])
        }
    }

    #[inline]
    pub fn get(&self, head: usize, len: usize, index: usize) -> Option<T> {
        if index >= len {
            return None;
        }
        let mask = self.cap() - 1;
        let start_slot = if len < self.cap() { 0 } else { head };
        let i = (start_slot + index) & mask;
        Some(self.data[i])
    }
}

impl<T> Ring<T> {
    #[inline]
    pub fn as_logical_slices(&self, head: usize, len: usize) -> (&[T], &[T]) {
        let cap = self.cap();
        if len < cap {
            (&self.data[..head], &[])
        } else {
            (&self.data[head..], &self.data[..head])
        }
    }

    #[inline]
    pub fn write(&mut self, index: usize, value: T) {
        self.data[index] = value;
    }

    #[inline]
    pub fn cap(&self) -> usize {
        self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_partial_fill() {
        let mut ring = Ring::<u64>::new(4);

        ring.write(0, 10);
        ring.write(1, 20);

        assert_eq!(ring.get(2, 2, 0), Some(10)); // Oldest.
        assert_eq!(ring.get(2, 2, 1), Some(20)); // Newest.
        assert_eq!(ring.get(2, 2, 2), None); // OOB.

        let (left, right) = ring.as_logical_slices(2, 2);
        assert_eq!(left, &[10, 20]);
        assert_eq!(right, &[]);
    }

    #[test]
    fn test_wrap() {
        let mut ring = Ring::<u64>::new(4);

        for (i, v) in [10, 20, 30, 40].iter().enumerate() {
            ring.write(i, *v);
        }

        // Overwrite first two slots.
        ring.write(0, 50);
        ring.write(1, 60);

        assert_eq!(ring.get(2, 4, 0), Some(30));
        assert_eq!(ring.get(2, 4, 1), Some(40));
        assert_eq!(ring.get(2, 4, 2), Some(50));
        assert_eq!(ring.get(2, 4, 3), Some(60));

        let (old_slice, new_slice) = ring.as_logical_slices(2, 4);
        assert_eq!(old_slice, &[30, 40]);
        assert_eq!(new_slice, &[50, 60]);
    }

    #[test]
    #[should_panic]
    fn test_ring_requires_power_of_two() {
        let _ = Ring::<i32>::new(5);
    }
}

// TODO: Can have some kind of generic wrapper RingArray in here too,
// for using Ring in a more normal way.
