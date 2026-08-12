#![allow(warnings)]

pub mod engine;
pub mod job;
pub mod probe;
pub mod ring_array;
pub mod string;
pub mod thread;

use std::time::{SystemTime, UNIX_EPOCH};

pub mod medic {
    include!(concat!(env!("OUT_DIR"), "/medic.rs"));
}

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}
