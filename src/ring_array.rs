#[derive(Debug)]
pub struct RingArray<T> {
    data: Box<[T]>,
    head: usize,
    len: usize,
}

impl<T: Default + Clone> RingArray<T> {
    pub fn new(cap: usize) -> Self {
        let data: Box<[T]> = vec![T::default(); cap].into_boxed_slice();
        let head: usize = 0;
        let len: usize = 0;

        RingArray { data, head, len }
    }

    #[inline]
    pub fn cap(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn push(&mut self, value: T) {
        if self.cap() == 0 {
            self.data = vec![T::default(); 2].into_boxed_slice();
        }

        if self.len < self.cap() {
            self.data[self.len] = value;
            self.len += 1;
        } else {
            self.data[self.head] = value;
            self.head = (self.head + 1) % self.cap();
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = &T> {
        let (first, second) = if self.len < self.cap() {
            (&self.data[..self.len], &self.data[0..0])
        } else {
            (&self.data[self.head..], &self.data[..self.head])
        };

        first.iter().chain(second.iter())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_and_empty() {
        let ring: RingArray<i32> = RingArray::new(5);

        assert_eq!(ring.cap(), 5);
        assert!(ring.is_empty());
        assert_eq!(ring.iter().count(), 0);
    }

    #[test]
    fn test_partial_fill() {
        let mut ring = RingArray::new(5);
        ring.push(10);
        ring.push(20);

        assert!(!ring.is_empty());
        assert_eq!(ring.cap(), 5);

        let collected: Vec<&i32> = ring.iter().collect();
        // Iteraton matches push order?
        assert_eq!(collected, vec![&10, &20]);
    }

    #[test]
    fn test_exact_cap() {
        let mut ring = RingArray::new(3);

        ring.push(1);
        ring.push(2);
        ring.push(3);

        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![1, 2, 3]);
    }

    #[test]
    fn test_overwriting() {
        let mut ring = RingArray::new(3);

        ring.push(1);
        ring.push(2);
        ring.push(3);

        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![1, 2, 3]);

        // Should overwrite the olds, which is 1.
        ring.push(4);
        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![2, 3, 4]);

        // Overwrite 2
        ring.push(5);
        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![3, 4, 5]);

        // Overwrite 3
        ring.push(6);
        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![4, 5, 6]);
    }

    #[test]
    fn test_multiple_wraparounds() {
        let mut ring = RingArray::new(3);

        for i in 1..=10 {
            ring.push(i);
        }

        assert_eq!(ring.iter().copied().collect::<Vec<i32>>(), vec![8, 9, 10]);
    }

    #[test]
    fn test_zero_capacity_guard() {
        // Zero cap is for lazy allocation.
        let mut ring: RingArray<i32> = RingArray::new(0);
        assert_eq!(ring.cap(), 0);
        assert!(ring.is_empty());

        // Now it should allocate a small initial size, so this should work.
        ring.push(42);

        assert_eq!(ring.iter().count(), 1);
    }
}
