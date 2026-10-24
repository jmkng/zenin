use std::collections::HashMap;
use std::sync::Arc;

/// Interned string identifier.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StringId(pub(crate) u32);

/// String interning pool.
#[derive(Debug, Default)]
pub struct StringPool {
    str_to_id: HashMap<Arc<str>, StringId>,
    id_to_str: Vec<Arc<str>>,
}

impl StringPool {
    /// Returns a new, empty pool.
    pub fn new() -> Self {
        Self {
            str_to_id: HashMap::new(),
            id_to_str: Vec::new(),
        }
    }

    /// Returns the identifier for a string,
    /// or None if the string has not been interned.
    #[inline]
    pub fn id(&self, text: &str) -> Option<StringId> {
        self.str_to_id.get(text).copied()
    }

    /// Returns the identifier for a string,
    /// interning it if missing.
    pub fn id_or_insert(&mut self, s: &str) -> StringId {
        if let Some(id) = self.id(s) {
            return id;
        }
        if let Some(&existing_id) = self.str_to_id.get(s) {
            return existing_id;
        }
        let new_id = StringId(self.id_to_str.len() as u32);
        let s: Arc<str> = Arc::from(s);
        self.str_to_id.insert(s.clone(), new_id);
        self.id_to_str.push(s);
        new_id
    }

    /// Returns the string associated with an identifier.
    #[inline]
    pub fn str(&self, id: StringId) -> Option<Arc<str>> {
        self.id_to_str.get(id.0 as usize).cloned()
    }
}
