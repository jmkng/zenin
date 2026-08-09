use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct StringId(u32);

impl StringId {
    #[inline]
    pub fn new(val: u32) -> Self {
        Self(val)
    }

    #[inline]
    pub fn f64(&self) -> f64 {
        self.0 as f64
    }

    #[inline]
    pub fn u32(&self) -> u32 {
        self.0
    }
}

#[derive(Debug, Default)]
pub struct StringPool {
    str_to_id: HashMap<Arc<str>, StringId>,
    id_to_str: Vec<Arc<str>>,
}

impl StringPool {
    /// Returns a new empty pool.
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns a new pool with at least the specified capacity.
    pub fn with_capacity(cap: usize) -> Self {
        Self {
            str_to_id: HashMap::with_capacity(cap),
            id_to_str: Vec::with_capacity(cap),
        }
    }

    /// Returns a StringId for text, interning it if missing.
    pub fn id_or_insert(&mut self, text: &str) -> StringId {
        if let Some(&id) = self.str_to_id.get(text) {
            return id;
        }

        let new_id = StringId(self.id_to_str.len() as u32);
        let shared: Arc<str> = Arc::from(text);

        self.str_to_id.insert(shared.clone(), new_id);
        self.id_to_str.push(shared);

        new_id
    }

    /// Returns a reference to the interned string for id.
    pub fn str(&self, id: StringId) -> Option<&str> {
        self.id_to_str.get(id.0 as usize).map(|s| &**s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_f64_roundtrip() {
        let id = StringId(42);
        let float_val = id.f64();

        assert_eq!(float_val, 42.0);
        assert_eq!(StringId::new(float_val as u32), id);
    }

    #[test]
    fn test_insert_is_sequential() {
        let mut dict = StringPool::new();

        let id0 = dict.id_or_insert("a.b");
        let id1 = dict.id_or_insert("c.d");
        let id2 = dict.id_or_insert("efg");

        assert_eq!(id0, StringId(0));
        assert_eq!(id1, StringId(1));
        assert_eq!(id2, StringId(2));
    }

    #[test]
    fn test_dedup() {
        let mut dict = StringPool::new();

        let id_first = dict.id_or_insert("a.b");
        let _id_other = dict.id_or_insert("c.d");
        let id_second = dict.id_or_insert("a.b");

        assert_eq!(id_first, StringId(0));
        // Should return the original.
        assert_eq!(id_first, id_second);
        assert!(![id_first, id_second].contains(&_id_other));
    }

    #[test]
    fn test_id_to_str() {
        let mut dict = StringPool::new();

        let a_id = dict.id_or_insert("a");
        let b_id = dict.id_or_insert("b");

        assert_eq!(dict.str(a_id), Some("a"));
        assert_eq!(dict.str(b_id), Some("b"));
    }

    #[test]
    fn test_oob_is_none() {
        let mut dict = StringPool::new();
        assert_eq!(dict.str(StringId(999)), None);
        dict.id_or_insert("a");
        assert_eq!(dict.str(StringId(999)), None);
        assert_eq!(dict.str(StringId(0)), Some("a"));
    }

    #[test]
    fn test_empty_string_works() {
        let mut dict = StringPool::new();

        let empty_id = dict.id_or_insert("");
        assert_eq!(dict.str(empty_id), Some(""));

        let empty_id_dup = dict.id_or_insert("");
        assert_eq!(empty_id, empty_id_dup);
    }

    #[test]
    fn test_with_cap() {
        let dict = StringPool::with_capacity(1024);
        assert!(dict.str_to_id.capacity() >= 1024);
        assert!(dict.id_to_str.capacity() >= 1024);
    }
}
