use crate::{Timestamp, ring_array::RingArray, string::StringId};
use core::fmt::{Debug, Result as FmtResult};
use std::collections::HashMap;
use std::fmt::Formatter;
use std::hash::{Hash, Hasher};

pub type Value = f64;

pub const MAX_LABELS: usize = 8;

/// Labels are canonicalized.
#[derive(Clone, Eq)]
pub struct MetricId {
    pub name: StringId,
    pub labels: [(StringId, StringId); MAX_LABELS],
    pub len: usize,
}

impl Debug for MetricId {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        let active_labels = &self.labels[..self.len];

        f.debug_struct("MetricId")
            .field("name", &self.name)
            .field("labels", &active_labels)
            .field("len", &self.len)
            .finish()
    }
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

        // The labels MUST be canonicalized.
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

// These can be parallel arrays, but I don't think the rings will get very big
// and this is easier.

pub type Metric = (MetricId, f64);
pub type RingValue = (Timestamp, Value);
pub type MetricArray = RingArray<RingValue>;

pub struct SortedIntersect<'a> {
    shortest: &'a [SeriesId],
    shortest_index: usize,
    remaining: [&'a [SeriesId]; MAX_LABELS],
    remaining_len: usize,
    remaining_pos: [usize; MAX_LABELS],
}

impl<'a> SortedIntersect<'a> {
    pub fn new(series: &[&'a [SeriesId]]) -> Self {
        if series.len() == 0 {
            return Self {
                shortest: &[],
                shortest_index: 0,
                remaining: [&[]; MAX_LABELS],
                remaining_len: 0,
                remaining_pos: [0; MAX_LABELS],
            };
        }

        // Find index of shortest slice.
        let mut shortest_idx = 0;
        let mut min_len = series[0].len();
        for i in 1..series.len() {
            if series[i].len() < min_len {
                min_len = series[i].len();
                shortest_idx = i;
            }
        }

        let shortest = series[shortest_idx];

        // Move all others to other_slices.
        let mut other_slices = [&[] as &[SeriesId]; MAX_LABELS];
        let mut other_count = 0;
        for i in 0..series.len() {
            if i != shortest_idx {
                other_slices[other_count] = series[i];
                other_count += 1;
            }
        }

        Self {
            shortest,
            shortest_index: 0,
            remaining: other_slices,
            remaining_len: other_count,
            remaining_pos: [0; MAX_LABELS],
        }
    }
}

impl<'a> Iterator for SortedIntersect<'a> {
    type Item = SeriesId;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        'outer: while self.shortest_index < self.shortest.len() {
            let candidate = self.shortest[self.shortest_index];
            self.shortest_index += 1;

            for i in 0..self.remaining_len {
                let slice = &self.remaining[i][self.remaining_pos[i]..];

                match slice.binary_search(&candidate) {
                    Ok(found_idx) => {
                        self.remaining_pos[i] += found_idx + 1;
                    }
                    Err(insert_idx) => {
                        self.remaining_pos[i] += insert_idx;
                        continue 'outer;
                    }
                }
            }

            return Some(candidate);
        }

        None
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct SeriesId(u32);

pub struct Engine {
    /// Ring array per metric identity. (name/labels)
    /// Indexed by SeriesId.
    series: Vec<MetricArray>,
    /// Size of MetricArrays in series.
    metric_array_size: usize,

    /// Map metric identity to series.
    identity: HashMap<MetricId, SeriesId>,
    /// Map metric name to series.
    name: HashMap<StringId, Vec<SeriesId>>,
    /// Map label key-value pair to series.
    label: HashMap<(StringId, StringId), Vec<SeriesId>>,
}

pub enum SaveError {
    MaxSeriesExceeded,
}

impl Engine {
    /// series_cap is the capacity for each metric array.
    /// Retention window is determined by probe execution intervals.
    pub fn new(metric_array_size: usize) -> Self {
        return Self {
            series: Vec::new(),
            metric_array_size,
            identity: HashMap::new(),
            name: HashMap::new(),
            label: HashMap::new(),
        };
    }

    pub fn save(&mut self, metric_id: MetricId, time: u64, value: f64) -> Result<(), SaveError> {
        let series_id = if let Some(&id) = self.identity.get(&metric_id) {
            id
        } else {
            let Ok(new_id_raw) = u32::try_from(self.series.len()) else {
                return Err(SaveError::MaxSeriesExceeded);
            };

            let new_id = SeriesId(new_id_raw);

            let new_ring = MetricArray::new(self.metric_array_size);
            self.series.push(new_ring);

            // Update indexes.

            self.identity.insert(metric_id.clone(), new_id);

            self.name.entry(metric_id.name).or_default().push(new_id);

            for &(k, v) in metric_id.labels().iter() {
                self.label.entry((k, v)).or_default().push(new_id);
            }

            new_id
        };

        self.series[series_id.0 as usize].push((time, value));
        Ok(())
    }

    pub fn query(
        &self,
        name: Option<StringId>,
        labels: &[(StringId, StringId)],
        start_ms: u64,
        end_ms: u64,
    ) -> impl Iterator<Item = (SeriesId, RingValue)> {
        let series_iter = self.find_matching_series(name, labels);

        series_iter.flat_map(move |series_id| {
            let buffer = &self.series[series_id.0 as usize];
            buffer
                .iter()
                .copied()
                .filter(move |&(time, _)| time >= start_ms && time <= end_ms)
                .map(move |sample| (series_id, sample))
        })
    }

    /// Returns matching series by set intersection.
    pub fn find_matching_series<'a>(
        &'a self,
        name: Option<StringId>,
        labels: &[(StringId, StringId)],
    ) -> SortedIntersect<'a> {
        const MAX_QUERY: usize = MAX_LABELS + 1; // + 1 for the name.

        // MAX_LABELS is the max labels per series.
        // Create an array of that size, and set each slot to the index list for tht label.
        let mut series_list = [&[] as &[SeriesId]; MAX_QUERY];
        let mut count = 0;

        if let Some(name_id) = name {
            if let Some(list) = self.name.get(&name_id) {
                series_list[count] = list.as_slice();
                count += 1;
            } else {
                return SortedIntersect::new(&[]);
            }
        }

        let valid_label_count = labels.len().min(MAX_LABELS);

        for &label_pair in &labels[..valid_label_count] {
            if let Some(list) = self.label.get(&label_pair) {
                series_list[count] = list.as_slice();
                count += 1;
            } else {
                return SortedIntersect::new(&[]);
            }
        }

        SortedIntersect::new(&series_list[..count])
    }
}
