use std::slice::Iter;

use crate::engine::{EList, Engine, MAX_LABELS, SeriesId};
use crate::string::StringPool;

pub struct IxIter<'a> {
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
