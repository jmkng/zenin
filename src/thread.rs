use crate::engine::Engine;
use crate::engine::ix::IxIter;
use crate::now_s;
use crate::probe::cpu::MedicCpuProbe;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{JoinHandle, sleep, spawn};
use std::time::{Duration, Instant};

pub fn spawn_interval_loop(
    stop: &'static AtomicBool,
    engine: Arc<Mutex<Engine>>,
    mut probe: MedicCpuProbe,
) -> JoinHandle<()> {
    let tick_interval = Duration::from_secs(1);
    let mut next_tick = Instant::now();

    spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            next_tick += tick_interval;

            {
                let mut _engine = engine.lock().unwrap();
                interval_loop_work(&mut _engine, &mut probe);
            }

            let sleep_time = next_tick.saturating_duration_since(Instant::now());
            if !sleep_time.is_zero() {
                sleep(sleep_time);
            } else {
                // Interval overrun, reset for next tick.
                next_tick = Instant::now();
            }
        }
    })
}

#[inline]
pub fn interval_loop_work(engine: &mut Engine, probe: &mut MedicCpuProbe) {
    probe.emit(|series_id, value| {
        engine.push(series_id, now_s(), value);
    });
}
