#![allow(warnings)]

use std::time::{SystemTime, UNIX_EPOCH};

pub mod engine;
pub mod job;
pub mod probe;
pub mod ring_array;
pub mod string;

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}
