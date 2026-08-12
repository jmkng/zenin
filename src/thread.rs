use crate::engine::{Engine, SeriesId};
use crate::job::JobScheduler;
use crate::now;
use crate::probe::cpu::MedicCpuProbe;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::{JoinHandle, sleep, spawn};
use std::time::{Duration, Instant};

pub fn spawn_interval_loop(
    stop: &'static AtomicBool,
    mut engine: Engine,
    mut probe: MedicCpuProbe,
) -> JoinHandle<()> {
    let interval = Duration::from_secs(1);
    let mut next_tick = Instant::now();

    spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            next_tick += interval;

            interval_work(&mut engine, &mut probe);

            let sleep_time = next_tick.saturating_duration_since(Instant::now());
            if !sleep_time.is_zero() {
                sleep(sleep_time);
            } else {
                // Interval overrun, reset next_tick.
                next_tick = Instant::now();
            }
        }
    })
}

#[inline]
pub fn interval_work(mut engine: &mut Engine, mut probe: &mut MedicCpuProbe) {
    probe.sample(|series_id, value| {
        let now = now();
        println!("[{}] {}: {}", now, series_id, value);
        engine.save(series_id, now, value);
    });
}
