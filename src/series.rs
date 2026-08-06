use crate::{Timestamp, ring_array::RingArray, string::StringId};
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

pub type Value = f64;

/// Labels are canonicalized.
#[derive(Debug, Clone, Eq)]
pub struct MetricId {
    pub name: StringId,
    pub labels: [(StringId, StringId); 8],
    pub len: usize,
}

impl Hash for MetricId {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.name.hash(state);
        self.len.hash(state);
        self.labels[..self.len].hash(state);
    }
}

impl PartialEq for MetricId {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
            && self.len == other.len
            && self.labels[..self.len] == other.labels[..other.len]
    }
}

impl MetricId {
    pub fn new(name: StringId, labels: &[(StringId, StringId)]) -> Self {
        let count = labels.len().min(8);
        let mut active_labels = [(StringId::default(), StringId::default()); 8];

        active_labels[..count].copy_from_slice(&labels[..count]);

        active_labels[..count].sort_unstable_by_key(|(key, _)| *key);

        Self {
            name,
            labels: active_labels,
            len: count,
        }
    }

    #[inline]
    pub fn labels(&self) -> &[(StringId, StringId)] {
        &self.labels[..self.len]
    }
}

pub type RingValue = (Timestamp, Value);
pub type MetricArray = RingArray<RingValue>;

pub struct Engine {
    series: HashMap<MetricId, MetricArray>,
    series_cap: usize,
}

impl Engine {
    /// series_cap is the capacity for each metric array.
    /// Retention window is determined by probe execution intervals.
    pub fn new(series_cap: usize) -> Self {
        return Engine {
            series: HashMap::new(),
            series_cap,
        };
    }

    pub fn with_capacity(cap: usize, series_cap: usize) -> Self {
        return Self {
            series: HashMap::with_capacity(cap),
            series_cap,
        };
    }

    pub fn record(&mut self, key: MetricId, timestamp: u64, value: f64) {
        let buffer = self
            .series
            .entry(key)
            .or_insert_with(|| RingArray::new(self.series_cap));

        buffer.push((timestamp, value));
    }

    pub fn query(
        &self,
        key: &MetricId,
        start_ms: u64,
        end_ms: u64,
    ) -> impl Iterator<Item = RingValue> {
        self.series
            .get(key)
            .into_iter()
            .flat_map(move |buffer| buffer.iter())
            .copied()
            .filter(move |sample| sample.0 >= start_ms && sample.0 <= end_ms)
    }
}
