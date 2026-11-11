use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread::{self, sleep};
use std::time::{Duration, Instant};

use zenin::array_pool::ArrayPool;
use zenin::cache_padded::Pad;

const CAP: usize = 16 * 1024 / size_of::<Payload>();

#[repr(C)]
#[derive(Default, Copy, Clone)]
pub struct Payload {
    pub data: [u8; 32],
}

fn bench_thread<const CAP: usize>(
    pool: Arc<ArrayPool<Payload, CAP>>,
    batch_size: usize,
    stop: Arc<AtomicBool>,
    alloc_ops: Arc<Pad<AtomicUsize>>,
    dealloc_ops: Arc<Pad<AtomicUsize>>,
) {
    let mut batch = Vec::with_capacity(batch_size);

    while !stop.load(Ordering::Relaxed) {
        batch.clear();
        for _ in 0..batch_size {
            let slot = pool.alloc(Payload { data: [0xAB; 32] });
            batch.push(slot);
            alloc_ops.value.fetch_add(1, Ordering::Relaxed);
        }

        for _ in 0..10 {
            std::hint::spin_loop();
        }

        drop(batch.drain(..));
        dealloc_ops.value.fetch_add(batch_size, Ordering::Relaxed);
    }
}

fn main() {
    let threads = 4;
    let batch_size = 128;
    let duration_secs = 5;

    let pool = Arc::new(ArrayPool::<Payload, CAP>::new(128));

    println!(
        "ArrayPool Benchmark
        * threads: {}
        * iterations: {}
        * segment cap: {}",
        threads, batch_size, CAP
    );

    let stop = Arc::new(AtomicBool::new(false));

    let num_allocs = Arc::new(Pad::new(AtomicUsize::new(0)));
    let num_deallocs = Arc::new(Pad::new(AtomicUsize::new(0)));

    let started = Instant::now();
    let mut handles = vec![];

    for _ in 0..threads {
        let pool = Arc::clone(&pool);
        let stop = Arc::clone(&stop);
        let num_allocs = Arc::clone(&num_allocs);
        let num_deallocs = Arc::clone(&num_deallocs);

        handles.push(thread::spawn(move || {
            bench_thread(pool, batch_size, stop, num_allocs, num_deallocs);
        }));
    }

    let mut alloc_ops = 0;
    let mut dealloc_ops = 0;
    let mut countdown = duration_secs;

    while countdown > 0 {
        countdown -= 1;
        sleep(Duration::from_secs(1));

        let a = num_allocs.value.load(Ordering::Relaxed);
        let d = num_deallocs.value.load(Ordering::Relaxed);

        println!(
            "1/s Throughput: {:.2} M alloc/s | {:.2} M free/s",
            (a - alloc_ops) as f64 / 1_000_000.0,
            (d - dealloc_ops) as f64 / 1_000_000.0
        );

        alloc_ops = a;
        dealloc_ops = d;
    }

    stop.store(true, Ordering::Relaxed);

    for handle in handles {
        handle.join().unwrap();
    }

    let dur_secs = started.elapsed().as_secs_f64();

    let total_allocs = num_allocs.value.load(Ordering::Relaxed);
    let total_deallocs = num_deallocs.value.load(Ordering::Relaxed);

    println!(
        "{}/s Average Throughput: {:.2} M allocs/s | {:.2} M deallocs/s",
        duration_secs,
        (total_allocs as f64 / dur_secs) / 10000000f64,
        (total_deallocs as f64 / dur_secs) / 10000000f64
    );
    println!("Total Operations: {} allocs | {} deallocs", total_allocs, total_deallocs);
}
