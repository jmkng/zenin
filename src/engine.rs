pub mod binary_op;
pub mod irate;
pub mod scale;
pub mod sum;

use crate::ring_array::Ring;
use crate::string::{StringId, StringPool};
use binary_op::binary_op;
use core::fmt::{Debug, Result as FmtResult};
use irate::irate;
use scale::scale;
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::hash::{Hash, Hasher};
use std::ops::{Deref, Index, IndexMut};
use std::slice::Iter;
use sum::sum;

pub const MAX_LABELS: usize = 16;

#[derive(Clone, Copy, Eq)]
pub struct MetricId {
    pub name: StringId,
    pub labels: [(StringId, StringId); MAX_LABELS],
    pub len: u8,
}

impl Debug for MetricId {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        let active = &self.labels[..self.len as usize];

        f.debug_struct("MetricId")
            .field("name", &self.name)
            .field("labels", &active)
            .field("len", &self.len)
            .finish()
    }
}

impl Hash for MetricId {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.name.hash(state);
        self.len.hash(state);
        self.labels[..self.len as usize].hash(state);
    }
}

impl PartialEq for MetricId {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
            && self.len == other.len
            && self.labels[..self.len as usize] == other.labels[..other.len as usize]
    }
}

impl MetricId {
    pub fn new(name: StringId, labels: &[(StringId, StringId)]) -> Self {
        let len = labels.len().min(MAX_LABELS);
        let mut labels_array = [(StringId::default(), StringId::default()); MAX_LABELS];

        // Labels must be canonicalized.
        labels_array[..len].copy_from_slice(&labels[..len]);
        labels_array[..len].sort_unstable_by_key(|(key, _)| *key);

        Self {
            name,
            labels: labels_array,
            len: len as u8,
        }
    }

    #[inline]
    pub fn labels(&self) -> &[(StringId, StringId)] {
        &self.labels[..self.len as usize]
    }

    /// Returns true if this MetricId refers to the same series as other.
    #[inline]
    pub fn matches(&self, other: MetricId) -> bool {
        if self.name != other.name {
            return false;
        }

        for a in other.labels.iter() {
            let mut found = false;
            for b in self.labels().iter() {
                if a.0 == b.0 && a.1 == b.1 {
                    found = true;
                    break;
                }
            }

            if !found {
                return false;
            }
        }
        true
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
    pub(crate) fn new(val: u32) -> Self {
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
pub(crate) struct EList(Vec<SeriesId>);

impl EList {
    /// Appends a new ID to the list.
    pub fn push(&mut self, id: SeriesId) {
        if let Some(&last) = self.0.last() {
            debug_assert!(id > last, "EList must be sorted");
        }
        self.0.push(id);
    }

    /// Returns the number of IDs in the list.
    pub fn len(&self) -> usize {
        self.0.len()
    }
}

impl Deref for EList {
    type Target = [SeriesId];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum MetricUnit {
    None = 0,
    Count = 1,
    Ratio = 2,
    Bytes = 3,
    Seconds = 4,
    CountPerSecond = 5,
    BytesPerSecond = 6,
}

impl MetricUnit {
    /// Returns a string representation of the unit.
    /// This is not a standard chart symbol.
    pub const fn as_str(self) -> &'static str {
        match self {
            MetricUnit::None => "none",
            MetricUnit::Count => "count",
            MetricUnit::Ratio => "ratio",
            MetricUnit::Bytes => "bytes",
            MetricUnit::Seconds => "seconds",
            MetricUnit::CountPerSecond => "count/s",
            MetricUnit::BytesPerSecond => "bytes/s",
        }
    }

    /// Returns a standard chart symbol.
    #[inline]
    pub const fn symbol(self) -> &'static str {
        match self {
            Self::None => "",
            Self::Count => "",
            Self::Ratio => "",
            Self::Bytes => "B",
            Self::Seconds => "s",
            Self::CountPerSecond => "/s",
            Self::BytesPerSecond => "B/s",
        }
    }

    /// Return the per second equivalent of the unit.
    pub const fn per_second(self) -> Self {
        match self {
            Self::Count => Self::CountPerSecond,
            Self::Bytes => Self::BytesPerSecond,
            Self::Seconds => Self::Ratio,
            Self::Ratio => Self::Ratio,
            Self::None => Self::None,
            Self::CountPerSecond => Self::CountPerSecond,
            Self::BytesPerSecond => Self::BytesPerSecond,
        }
    }

    /// Returns true when the unit represents a rate per second.
    #[inline]
    pub const fn is_rate(self) -> bool {
        matches!(self, Self::CountPerSecond | Self::BytesPerSecond)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum MetricKind {
    Point,
    Monotonic,
}

impl MetricKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Point => "point",
            Self::Monotonic => "monotonic",
        }
    }
}

#[derive(Debug, Default)]
pub(crate) struct EVec<T>(Vec<T>);

impl<T> EVec<T> {
    pub fn new() -> Self {
        EVec(Vec::new())
    }

    #[inline]
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

    #[inline]
    pub fn iter(&self) -> std::slice::Iter<'_, T> {
        self.0.iter()
    }
}

impl<T> Index<SeriesId> for EVec<T> {
    type Output = T;

    #[inline]
    fn index(&self, id: SeriesId) -> &T {
        &self.0[id.0 as usize]
    }
}

impl<T> IndexMut<SeriesId> for EVec<T> {
    #[inline]
    fn index_mut(&mut self, id: SeriesId) -> &mut T {
        &mut self.0[id.0 as usize]
    }
}

/// Single time-value pair.
#[derive(Clone, Copy, Default)]
pub struct Point {
    pub t: u64,
    pub v: f64,
}

impl From<(u64, f64)> for Point {
    fn from(value: (u64, f64)) -> Self {
        Self {
            t: value.0,
            v: value.1,
        }
    }
}

pub struct Query<'a> {
    pub expr: Expr<'a>,
    pub start_s: u64,
    pub end_s: u64,
    pub step_s: u64,
}

#[derive(Debug, Clone)]
pub enum RollupOp {
    IRate,
}

#[derive(Debug, Clone)]
pub enum AggregateOp {
    Sum,
}

#[derive(Debug, Clone, Copy)]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
}

#[derive(Debug, Clone)]
pub enum Expr<'a> {
    Selector {
        name: &'a str,
        labels: &'a [(&'a str, &'a str)],
    },
    Rollup {
        op: RollupOp,
        inner: Box<Expr<'a>>,
        hist_s: u64,
    },
    Aggregate {
        op: AggregateOp,
        inner: Box<Expr<'a>>,
    },
    Binary {
        op: BinaryOp,
        left: Box<Expr<'a>>,
        right: Box<Expr<'a>>,
    },
}

/// Executable equivalent of Query.
pub trait Plan {
    fn eval(&mut self, eval_t: u64, step_s: u64, out: &mut Vec<f64>);
    fn unit(&self) -> MetricUnit;
}

impl<T: Plan + ?Sized> Plan for Box<T> {
    fn eval(&mut self, eval_t: u64, step_s: u64, out: &mut Vec<f64>) {
        (**self).eval(eval_t, step_s, out);
    }

    fn unit(&self) -> MetricUnit {
        (**self).unit()
    }
}

pub struct SumNode<'a> {
    pub inner: Box<dyn Plan + 'a>,
}

impl Plan for SumNode<'_> {
    fn eval(&mut self, eval_t: u64, step_s: u64, out: &mut Vec<f64>) {
        let start_len = out.len();

        self.inner.eval(eval_t, step_s, out);

        if let Some(total) = sum(&out[start_len..]) {
            out.truncate(start_len);
            out.push(total);
        } else {
            out.truncate(start_len);
        }
    }

    #[inline]
    fn unit(&self) -> MetricUnit {
        self.inner.unit()
    }
}

pub struct ScaleNode {
    pub inner: Box<dyn Plan>,
    pub factor: f64,
}

impl Plan for ScaleNode {
    fn eval(&mut self, eval_t: u64, step_s: u64, out: &mut Vec<f64>) {
        let start_len = out.len();
        self.inner.eval(eval_t, step_s, out);

        scale(&mut out[start_len..], self.factor);
    }

    fn unit(&self) -> MetricUnit {
        self.inner.unit()
    }
}

pub struct BinaryOpNode<L, R> {
    pub left: L,
    pub right: R,
    pub op: BinaryOp,
}

impl<L, R> BinaryOpNode<L, R> {
    pub fn new(left: L, right: R, op: BinaryOp) -> Self {
        Self { left, right, op }
    }
}

impl<L: Plan, R: Plan> Plan for BinaryOpNode<L, R> {
    fn eval(&mut self, eval_t: u64, step_s: u64, out: &mut Vec<f64>) {
        let start_len = out.len();

        self.left.eval(eval_t, step_s, out);
        let left_v = out.pop().unwrap_or(f64::NAN);

        self.right.eval(eval_t, step_s, out);
        let right_v = out.pop().unwrap_or(f64::NAN);

        out.truncate(start_len);

        let result = binary_op(left_v, right_v, self.op);

        out.push(result);
    }

    fn unit(&self) -> MetricUnit {
        match self.op {
            BinaryOp::Add | BinaryOp::Sub => self.left.unit(),
            BinaryOp::Mul | BinaryOp::Div => match (self.left.unit(), self.right.unit()) {
                (l, r) if l == r && matches!(self.op, BinaryOp::Div) => MetricUnit::Ratio,
                (l, _) => l,
            },
        }
    }
}

pub struct RollupNode<'a, R: Reducer> {
    pub hist_s: u64,
    pub windows: Vec<EWindow<'a>>,
    pub origin: MetricUnit,
    pub reducer: R,
}

impl<'a, R: Reducer> Plan for RollupNode<'a, R> {
    fn eval(&mut self, eval_t: u64, _step_s: u64, out: &mut Vec<f64>) {
        for window in &mut self.windows {
            let view = window.slide(eval_t, self.hist_s);
            if let Some(val) = self.reducer.reduce(&view) {
                out.push(val);
            }
        }
    }

    #[inline]
    fn unit(&self) -> MetricUnit {
        self.reducer.unit(self.origin)
    }
}

/// Operates on a series window. `window -> value`
pub trait Reducer {
    fn reduce(&self, v: &View) -> Option<f64>;
    fn unit(&self, origin: MetricUnit) -> MetricUnit;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct IRateReducer;

impl Reducer for IRateReducer {
    #[inline(always)]
    fn reduce(&self, v: &View) -> Option<f64> {
        irate(v)
    }

    #[inline(always)]
    fn unit(&self, origin: MetricUnit) -> MetricUnit {
        origin.per_second()
    }
}

/// Operates on a scalar. `scalar -> scalar`
pub trait Transformer {
    fn transform(&self, v: f64) -> f64;
}

pub struct NoOpTransformer;

impl Transformer for NoOpTransformer {
    #[inline(always)]
    fn transform(&self, v: f64) -> f64 {
        v
    }
}

pub trait Sink {
    fn point(&mut self, grid_t: u64, v: Option<f64>);
    fn unit(&mut self, unit: MetricUnit);
}

/// Composite series container holding two rings.
#[derive(Debug)]
pub struct Series {
    times: Ring<u64>,
    values: Ring<f64>,
    head: usize,
    len: usize,
}

impl Series {
    /// `cap` is the ring size.
    pub fn new(cap: usize) -> Self {
        Series {
            times: Ring::new(cap),
            values: Ring::new(cap),
            head: 0,
            len: 0,
        }
    }

    /// Returns a point by index.
    /// Index 0 is the oldest point.
    #[inline]
    pub fn get(&self, index: usize) -> Option<Point> {
        let t = self.times.get(self.head, self.len, index)?;
        let v = self.values.get(self.head, self.len, index)?;
        Some((t, v).into())
    }

    /// Appends a new point to the series.
    #[inline]
    pub fn push(&mut self, time: u64, value: f64) {
        self.times.write(self.head, time);
        self.values.write(self.head, value);

        let mask = self.cap() - 1;
        self.head = (self.head + 1) & mask;

        if self.len < self.cap() {
            self.len += 1;
        }
    }

    /// Binary search to find logical range.
    pub fn range_by_key(&self, start: u64, end: u64) -> (usize, usize) {
        if self.len == 0 || start > end {
            return (0, 0);
        }

        let (old_slice, new_slice) = self.times.as_logical_slices(self.head, self.len);

        let find_i = |t: u64| -> usize {
            let len_old = old_slice.len();
            if old_slice.is_empty() || t <= old_slice[len_old - 1] {
                old_slice.partition_point(|&pt| pt < t)
            } else {
                len_old + new_slice.partition_point(|&pt| pt < t)
            }
        };

        let start_i = find_i(start);
        let end_i = find_i(end.saturating_add(1));

        (start_i, end_i)
    }

    #[inline]
    pub fn len(&self) -> usize {
        self.len
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    #[inline]
    pub fn cap(&self) -> usize {
        self.times.cap()
    }
}

pub(crate) struct EWindow<'a> {
    series: &'a Series,
    /// Index for end of current window.
    head_i: usize,
    /// Index for start of current window.
    tail_i: usize,
    /// Upper bound. [..max]
    max: usize,
}

impl<'a> EWindow<'a> {
    pub fn new(series: &'a Series, start_s: u64, end_s: u64) -> Self {
        let (_, max) = series.range_by_key(start_s, end_s);
        Self {
            series,
            head_i: 0,
            tail_i: 0,
            max,
        }
    }

    /// Slide window to new position. [t - hist_s, t]
    pub fn slide(&mut self, t: u64, hist_s: u64) -> View<'a> {
        let window_start = t.saturating_sub(hist_s);

        while self.tail_i < self.max {
            match self.series.get(self.tail_i) {
                Some(point) if point.t < window_start => self.tail_i += 1,
                _ => break, // Found start, or hit None.
            }
        }

        while self.head_i < self.max {
            match self.series.get(self.head_i) {
                Some(point) if point.t <= t => self.head_i += 1,
                _ => break, // Passed target, or hit None.
            }
        }

        View {
            series: self.series,
            start: self.tail_i,
            end: self.head_i,
        }
    }
}

/// View of points. [start..end)
pub struct View<'a> {
    series: &'a Series,
    pub start: usize,
    pub end: usize,
}

impl<'a> View<'a> {
    #[inline]
    pub fn len(&self) -> usize {
        self.end.saturating_sub(self.start)
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.start >= self.end
    }

    #[inline]
    pub fn get(&self, offset: usize) -> Option<Point> {
        let index = self.start + offset;
        if index < self.end {
            self.series.get(index)
        } else {
            None
        }
    }
}
pub struct Engine {
    pub(crate) strings: StringPool,
    pub(crate) cap: usize,
    pub(crate) series: EVec<Series>,
    pub(crate) metrics: EVec<MetricId>,
    pub(crate) units: EVec<MetricUnit>,
    pub(crate) kinds: EVec<MetricKind>,
    pub(crate) metric_map: HashMap<MetricId, SeriesId>,
    pub(crate) name_map: HashMap<StringId, EList>,
    pub(crate) label_map: HashMap<(StringId, StringId), EList>,
}

#[derive(Debug)]
pub enum PlanError {
    BareSelectorNotAllowed,
    InvalidInnerExpr,
    SeriesNotFound,
}

impl Engine {
    const QUERY_BUF_SIZE: usize = 64;

    /// `cap` is the ring size for each series.
    pub fn new(cap: usize) -> Self {
        return Self {
            strings: StringPool::new(),
            cap,
            series: EVec::new(),
            metrics: EVec::new(),
            units: EVec::new(),
            kinds: EVec::new(),
            metric_map: HashMap::new(),
            name_map: HashMap::new(),
            label_map: HashMap::new(),
        };
    }

    /// Registers a new metric for storage in the engine.
    /// Interns any new strings, and pre-allocates all required storage.
    #[inline]
    pub fn register<const N: usize>(
        &mut self,
        name: &str,
        labels: &[(&str, &str); N],
        unit: MetricUnit,
        r#type: MetricKind,
    ) -> SeriesId {
        const { assert!(N <= MAX_LABELS) }
        self._register(name, &labels[..N], unit, r#type)
    }

    fn _register(
        &mut self,
        name: &str,
        labels: &[(&str, &str)],
        unit: MetricUnit,
        r#type: MetricKind,
    ) -> SeriesId {
        let name_id = self.strings.id_or_insert(name);

        let mut labels_array = [(StringId::new(0), StringId::new(0)); MAX_LABELS];

        for (i, pair) in labels.iter().enumerate() {
            labels_array[i].0 = self.strings.id_or_insert(pair.0);
            labels_array[i].1 = self.strings.id_or_insert(pair.1);
        }
        let label_ids = &labels_array[..labels.len()];

        let metric = MetricId::new(name_id, label_ids);
        if let Some(&existing_id) = self.metric_map.get(&metric) {
            return existing_id;
        }

        let series_len = self.series.len() as u32;
        let series_id = SeriesId::new(series_len);

        self.series.push(Series::new(self.cap));
        self.metrics.push(metric);
        self.units.push(unit);
        self.kinds.push(r#type);
        self.metric_map.insert(metric, series_id);
        self.name_map.entry(name_id).or_default().push(series_id);
        for &(k_id, v_id) in label_ids {
            self.label_map
                .entry((k_id, v_id))
                .or_default()
                .push(series_id);
        }

        series_id
    }

    /// Appends a time and value to a series.
    #[inline]
    pub fn push(&mut self, id: SeriesId, time: u64, value: f64) {
        self.series[id].push(time, value);
    }

    /// Returns a description of a metric.
    pub fn metric<'a>(&'a self, id: SeriesId) -> MetricRef<'a> {
        let metric = &self.metrics[id];

        let name = self.strings.str(metric.name).unwrap();
        let mut labels = [("", ""); MAX_LABELS];
        for (i, &(k, v)) in metric.labels().iter().enumerate() {
            labels[i] = (self.strings.str(k).unwrap(), self.strings.str(v).unwrap());
        }
        let len = metric.len;
        let unit = self.units[id];

        MetricRef {
            name,
            labels,
            len,
            unit,
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Query
    ////////////////////////////////////////////////////////////////////////////

    pub fn build_plan<'a>(
        &'a self,
        e: &Expr,
        start_s: u64,
        end_s: u64,
    ) -> Result<Box<dyn Plan + 'a>, PlanError> {
        match e {
            Expr::Selector { .. } => Err(PlanError::BareSelectorNotAllowed),
            Expr::Rollup { op, inner, hist_s } => {
                let (name, labels) = match inner.as_ref() {
                    Expr::Selector { name, labels } => (name, labels),
                    _ => return Err(PlanError::InvalidInnerExpr),
                };

                let (lists, lists_len) =
                    map_series(self, name, labels).ok_or(PlanError::SeriesNotFound)?;

                let fetch_start_s = start_s.saturating_sub(*hist_s);

                let windows: Vec<EWindow<'a>> = IxIter::new(&lists[..lists_len])
                    .map(|id| EWindow::new(&self.series[id], fetch_start_s, end_s))
                    .collect();

                let origin = IxIter::new(&lists[..lists_len])
                    .next()
                    .map(|id| self.units[id])
                    .unwrap();

                match op {
                    RollupOp::IRate => Ok(Box::new(RollupNode {
                        hist_s: *hist_s,
                        windows,
                        origin,
                        reducer: IRateReducer,
                    })),
                }
            }
            Expr::Aggregate { op, inner } => {
                let inner = self.build_plan(&inner, start_s, end_s)?;

                match op {
                    AggregateOp::Sum => Ok(Box::new(SumNode { inner })),
                }
            }
            Expr::Binary { op, left, right } => {
                let left = self.build_plan(&left, start_s, end_s)?;
                let right = self.build_plan(&right, start_s, end_s)?;

                Ok(Box::new(BinaryOpNode {
                    op: *op,
                    left,
                    right,
                }))
            }
        }
    }

    pub fn query(&self, q: Query, s: &mut impl Sink) -> Result<(), PlanError> {
        let plan = self.build_plan(&q.expr, q.start_s, q.end_s)?;
        self.eval_plan(plan, q.start_s, q.end_s, q.step_s, s);
        Ok(())
    }

    fn eval_plan(
        &self,
        mut plan: Box<dyn Plan + '_>,
        start_s: u64,
        end_s: u64,
        step_s: u64,
        sink: &mut impl Sink,
    ) {
        let mut eval_t = start_s;
        let mut buf = Vec::with_capacity(Self::QUERY_BUF_SIZE);

        sink.unit(plan.unit());

        while eval_t <= end_s {
            buf.clear();
            plan.eval(eval_t, step_s, &mut buf);
            sink.point(eval_t, buf.first().copied());
            eval_t += step_s;
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct MetricRef<'a> {
    name: &'a str,
    labels: [(&'a str, &'a str); MAX_LABELS],
    len: u8,
    unit: MetricUnit,
}

impl<'a> MetricRef<'a> {
    #[inline]
    pub fn name(&self) -> &str {
        self.name
    }

    #[inline]
    pub fn labels(&self) -> &[(&'a str, &'a str)] {
        &self.labels[..self.len as usize]
    }

    #[inline]
    pub fn unit(&self) -> MetricUnit {
        self.unit
    }
}

impl<'a> Display for MetricRef<'a> {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        f.write_str(self.name)?;

        if self.labels.is_empty() {
            return Ok(());
        }

        // Formatted as {k1="v1",k2="v2"}.
        f.write_str("{")?;
        for (i, (k, v)) in self.labels.iter().enumerate() {
            if i > 0 {
                f.write_str(",")?;
            }
            f.write_str(k)?;
            f.write_str("=\"")?;
            f.write_str(v)?;
            f.write_str("\"")?;
        }
        f.write_str("}")
    }
}

/// Returns an array of lists associated with a set of name and labels.
fn map_series<'engine, 'a>(
    engine: &'engine Engine,
    name: &'a str,
    labels: &'a [(&'a str, &'a str)],
) -> Option<([&'engine EList; MAX_LABELS + 1], usize)> {
    let name_id = engine.strings.id(name)?;
    let name_list = engine.name_map.get(&name_id)?;

    let mut lists = [name_list; MAX_LABELS + 1];
    let mut len = 1;

    for &(k, v) in labels {
        let k_id = engine.strings.id(k)?;
        let v_id = engine.strings.id(v)?;
        lists[len] = engine.label_map.get(&(k_id, v_id))?;
        len += 1;
    }

    Some((lists, len))
}

struct IxIter<'a> {
    shortest: Iter<'a, SeriesId>,
    others: [&'a EList; MAX_LABELS],
    others_len: usize,
}

impl<'a> IxIter<'a> {
    // Asserts `!series.is_empty()`.
    pub fn new(series: &[&'a EList]) -> Self {
        assert!(!series.is_empty());

        let shortest_i = series
            .iter()
            .enumerate()
            .min_by_key(|(_, s)| s.len())
            .map(|(i, _)| i)
            .unwrap();

        let mut others = [series[shortest_i]; MAX_LABELS];
        let mut others_len = 0;

        for (i, &list) in series.iter().enumerate() {
            if i != shortest_i {
                others[others_len] = list;
                others_len += 1;
            }
        }

        Self {
            shortest: series[shortest_i].iter(),
            others,
            others_len,
        }
    }
}

impl<'a> Iterator for IxIter<'a> {
    type Item = SeriesId;

    #[inline(always)]
    fn next(&mut self) -> Option<Self::Item> {
        let constraints = &self.others[..self.others_len];

        self.shortest
            .find(|&id| {
                constraints
                    .iter()
                    // SeriesList are always sorted.
                    .all(|&list| list.binary_search(id).is_ok())
            })
            .copied()
    }
}
////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////

#[cfg(test)]
mod tests {
    use crate::engine::{MetricKind, MetricUnit};

    use super::*;

    struct TestSink {
        points: Vec<(u64, Option<f64>)>,
        unit: MetricUnit,
    }

    impl TestSink {
        fn new() -> Self {
            Self {
                points: Vec::new(),
                unit: MetricUnit::None,
            }
        }
    }

    impl Sink for TestSink {
        fn point(&mut self, grid_t: u64, v: Option<f64>) {
            self.points.push((grid_t, v));
        }

        fn unit(&mut self, unit: MetricUnit) {
            self.unit = unit;
        }
    }

    #[test]
    fn test_util() {
        let mut engine = Engine::new(64);

        let name = "cpu.time";
        let hist_s = 15;

        const USER_LABELS: &[(&str, &str); 1] = &[("mode", "user")];
        const IDLE_LABELS: &[(&str, &str); 1] = &[("mode", "idle")];
        const SYSTEM_LABELS: &[(&str, &str); 1] = &[("mode", "system")];
        const NICE_LABELS: &[(&str, &str); 1] = &[("mode", "nice")];
        const ALL_LABELS: &[(&str, &str); 0] = &[];

        let s_user = engine.register(name, USER_LABELS, MetricUnit::Count, MetricKind::Monotonic);
        let s_idle = engine.register(name, IDLE_LABELS, MetricUnit::Count, MetricKind::Monotonic);
        let s_system = engine.register(
            name,
            SYSTEM_LABELS,
            MetricUnit::Count,
            MetricKind::Monotonic,
        );
        let s_nice = engine.register(name, NICE_LABELS, MetricUnit::Count, MetricKind::Monotonic);

        engine.push(s_user, 1000, 1200.0);
        engine.push(s_user, 1015, 1206.0);
        engine.push(s_idle, 1000, 8000.0);
        engine.push(s_idle, 1015, 8006.0);
        engine.push(s_system, 1000, 350.0);
        engine.push(s_system, 1015, 352.0);
        engine.push(s_nice, 1000, 50.0);
        engine.push(s_nice, 1015, 51.0);

        // TODO: This is all jank because I don't have a way to select
        // unions of labels yet. But doing it this way is a good test anyway..

        // Numerator first... (user + (system + nice))
        let active_user_expr = Expr::Aggregate {
            op: AggregateOp::Sum,
            inner: Box::new(Expr::Rollup {
                op: RollupOp::IRate,
                inner: Box::new(Expr::Selector {
                    name,
                    labels: USER_LABELS,
                }),
                hist_s,
            }),
        };

        let active_system_expr = Expr::Aggregate {
            op: AggregateOp::Sum,
            inner: Box::new(Expr::Rollup {
                op: RollupOp::IRate,
                inner: Box::new(Expr::Selector {
                    name,
                    labels: SYSTEM_LABELS,
                }),
                hist_s,
            }),
        };

        let active_nice_expr = Expr::Aggregate {
            op: AggregateOp::Sum,
            inner: Box::new(Expr::Rollup {
                op: RollupOp::IRate,
                inner: Box::new(Expr::Selector {
                    name,
                    labels: NICE_LABELS,
                }),
                hist_s,
            }),
        };

        let active_expr = Expr::Binary {
            op: BinaryOp::Add,
            left: Box::new(active_user_expr),
            right: Box::new(Expr::Binary {
                op: BinaryOp::Add,
                left: Box::new(active_system_expr),
                right: Box::new(active_nice_expr),
            }),
        };

        // Denominator.
        let total_expr = Expr::Aggregate {
            op: AggregateOp::Sum,
            inner: Box::new(Expr::Rollup {
                op: RollupOp::IRate,
                inner: Box::new(Expr::Selector {
                    name,
                    labels: ALL_LABELS,
                }),
                hist_s,
            }),
        };

        // Root expression. (active/total)
        let div_expr = Expr::Binary {
            op: BinaryOp::Div,
            left: Box::new(active_expr),
            right: Box::new(total_expr),
        };

        let start_s = 1015;
        let end_s = start_s;

        let mut sink = TestSink::new();

        let q = Query {
            start_s,
            end_s,
            step_s: 15,
            expr: div_expr,
        };
        engine
            .query(q, &mut sink)
            .expect("Query eval should not fail");

        assert_eq!(sink.points.len(), 1);
        let (t, v) = sink.points[0];
        assert_eq!(t, 1015);
        let ratio = v.expect("Point should not be None");

        // (6+2+1) / (6+6+2+1) = 9/15 = 0.60
        let expected = 0.60f64;

        assert!(
            (ratio - expected).abs() < 1e-6,
            "Expected ratio {}, got {}",
            expected,
            ratio
        );
    }
}
