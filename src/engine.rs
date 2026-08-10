use crate::ring_array::RingArray;
use crate::string::{StringId, StringPool};
use core::fmt::{Debug, Result as FmtResult};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::hash::{Hash, Hasher};
use std::ops::{Index, IndexMut};

#[derive(Clone, Eq)]
pub struct MetricId {
    pub name: StringId,
    /// Labels are canonicalized.
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

        // Labels MUST be canonicalized.
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

#[derive(Clone, Copy, Default, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct SeriesId(u32);

impl Display for SeriesId {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        write!(f, "{}", self.0)
    }
}

impl SeriesId {
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

#[derive(Default)]
struct SeriesList(Vec<SeriesId>);

impl SeriesList {
    /// Appends a SeriesId.
    /// Asserts that id > previous id.
    pub fn push(&mut self, id: SeriesId) {
        if let Some(&last) = self.0.last() {
            // They have to remain sorted, because the set intersection
            // (and others) depend on that.
            debug_assert!(
                id > last,
                "series sequence broken: attempted to push {:?} after {:?}",
                id,
                last
            );
        }
        self.0.push(id);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum Unit {
    Ratio = 0,
    Count = 1,
    Bytes = 2,
    Seconds = 3,
    Hertz = 4,
    Celsius = 5,
}

impl Unit {
    pub const fn as_str(self) -> &'static str {
        match self {
            Unit::Ratio => "ratio",
            Unit::Count => "count",
            Unit::Bytes => "bytes",
            Unit::Seconds => "seconds",
            Unit::Hertz => "hz",
            Unit::Celsius => "celsius",
        }
    }
}

#[derive(Debug)]
pub enum Type {
    Point,
    Monotonic,
}

impl Type {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Point => "point",
            Self::Monotonic => "monotonic",
        }
    }
}

/// Vec<T> indexed by SeriesId.
#[derive(Debug, Default)]
pub struct SeriesVec<T>(Vec<T>);

impl<T> SeriesVec<T> {
    pub fn new() -> Self {
        SeriesVec(Vec::new())
    }

    pub fn push(&mut self, value: T) {
        self.0.push(value);
    }

    #[inline]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl<T> Index<SeriesId> for SeriesVec<T> {
    type Output = T;

    #[inline]
    fn index(&self, id: SeriesId) -> &T {
        &self.0[id.0 as usize]
    }
}

impl<T> IndexMut<SeriesId> for SeriesVec<T> {
    #[inline]
    fn index_mut(&mut self, id: SeriesId) -> &mut T {
        &mut self.0[id.0 as usize]
    }
}

pub struct Engine {
     strings: StringPool,

     ring_size: usize,
     series: SeriesVec<MetricArray>,
     units: SeriesVec<Unit>,
     types: SeriesVec<Type>,

     identity: HashMap<MetricId, SeriesId>,

    /// The SeriesList must be sorted. This is handled by storing rings in a
    /// Vec and using length as the SeriesId.
     name: HashMap<StringId, SeriesList>,

    /// The SeriesList must be sorted. This is handled by storing rings in a
    /// Vec and using length as the SeriesId.
     label: HashMap<(StringId, StringId), SeriesList>,
}

pub enum SaveError {
    MaxSeriesExceeded,
}

const MAX_LABELS: usize = 8;

impl Engine {
    /// series_cap is the capacity for each metric array.
    /// Retention window is determined by probe execution intervals.
    pub fn new(ring_size: usize) -> Self {
        return Self {
            strings: StringPool::new(),
            ring_size,
            series: SeriesVec::new(),
            units: SeriesVec::new(),
            types: SeriesVec::new(),
            identity: HashMap::new(),
            name: HashMap::new(),
            label: HashMap::new(),
        };
    }

    /// Register a new metric for storage in the engine.
    /// Interns any new strings, and pre-allocates all required storage.
    pub fn register_series<const N: usize>(
        &mut self,
        name: &str,
        labels: [(&str, &str); N],
        unit: Unit,
        r#type: Type,
    ) -> SeriesId {
        const { assert!(N <= MAX_LABELS) }

        // Intern metric name and labels.
        let name_id = self.strings.id_or_insert(name);
        let mut label_ids: [(StringId, StringId); N] = [(StringId::new(0), StringId::new(0)); N];
        for i in 0..N {
            label_ids[i].0 = self.strings.id_or_insert(labels[i].0);
            label_ids[i].1 = self.strings.id_or_insert(labels[i].1);
        }

        let metric_id = MetricId::new(name_id, &label_ids);

        if let Some(&existing_id) = self.identity.get(&metric_id) {
            return existing_id;
        }

        // This is a new metric, so update indexes and record the ring.

        // Grab the next id, which needs to be in range of u32.
        let series_len = u32::try_from(self.series.len()).expect("process exceeded maximum series");
        let series_id = SeriesId::new(series_len);
        self.series.push(MetricArray::new(self.ring_size));
        self.units.push(unit);
        self.types.push(r#type);

        self.identity.insert(metric_id, series_id);
        self.name.entry(name_id).or_default().push(series_id);
        for &(k_id, v_id) in &label_ids {
            self.label.entry((k_id, v_id)).or_default().push(series_id);
        }

        series_id
    }

    /// Save value for a series identified by id.
    /// Hot path for sensor data ingest.
    #[inline]
    pub fn save(&mut self, id: SeriesId, time: u64, value: f64) {
        self.series[id].push((time, value));
    }

    // pub fn query(
    //     &self,
    //     name: Option<StringId>,
    //     labels: &[(StringId, StringId)],
    //     start_ms: u64,
    //     end_ms: u64,
    // ) -> impl Iterator<Item = (SeriesId, RingValue)> {
    //     let series_iter = self.set_intersect(name, labels);
    //
    //     series_iter.flat_map(move |series_id| {
    //         let buffer = &self.series[series_id.0 as usize];
    //         buffer
    //             .iter()
    //             .copied()
    //             .filter(move |&(time, _)| time >= start_ms && time <= end_ms)
    //             .map(move |sample| (series_id, sample))
    //     })
    // }

    // /// Returns matching series by set intersection.
    // pub fn set_intersect<'a>(
    //     &'a self,
    //     name: Option<StringId>,
    //     labels: &[(StringId, StringId)],
    // ) -> SortedIntersect<'a> {
    //     const MAX_QUERY: usize = MAX_LABELS + 1; // + 1 for the name.
    //
    //     // MAX_LABELS is the max labels per series.
    //     // Create an array of that size, and set each slot to the index list for tht label.
    //     let mut series_list = [&[] as &[SeriesId]; MAX_QUERY];
    //     let mut count = 0;
    //
    //     if let Some(name_id) = name {
    //         if let Some(list) = self.name.get(&name_id) {
    //             series_list[count] = list.as_slice();
    //             count += 1;
    //         } else {
    //             return SortedIntersect::new(&[]);
    //         }
    //     }
    //
    //     let valid_label_count = labels.len().min(MAX_LABELS);
    //
    //     for &label_pair in &labels[..valid_label_count] {
    //         if let Some(list) = self.label.get(&label_pair) {
    //             series_list[count] = list.as_slice();
    //             count += 1;
    //         } else {
    //             return SortedIntersect::new(&[]);
    //         }
    //     }
    //
    //     SortedIntersect::new(&series_list[..count])
    // }
}

pub type Timestamp = u64;
pub type Value = f64;
pub type Metric = (MetricId, Value);
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
