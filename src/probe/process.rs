#![allow(warnings)]
use std::io::Read;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use crate::series::{Metric, MetricId};
use crate::string::{StringId, StringPool};

const M_EXIT_CODE: &str = "process.exit_code";

pub struct ProbeHandles {
    exit_code: StringId,
}

impl ProbeHandles {
    pub fn register(dict: &mut StringPool) -> Self {
        Self {
            exit_code: dict.id_or_insert(M_EXIT_CODE),
        }
    }
}

pub struct ProcessProbe<'a, 'b> {
    // pub command: &'a str,
    // pub args: &'b [&'a str],
    // pub timeout_ms: u64,
    // pub stdout_max: usize,
    // pub stderr_max: usize,
}

impl<'a, 'b> ProcessProbe<'a, 'b> {
    pub fn sample(&self, mut emit: impl FnMut(&str, f64)) {
        // let timeout = Duration::from_millis(self.timeout_ms);
        //
        // // let exit_code_id = MetricId::new(
        // //     strings.id(M_EXIT_CODE).expect("string should be interned"),
        // //     &[],
        // // );
        // let mut exit_code = -1;
        //
        // let Ok(mut child) = Command::new(&self.command)
        //     .args(self.args)
        //     .stdout(Stdio::piped())
        //     .stderr(Stdio::piped())
        //     .spawn()
        // else {
        //     emit(M_EXIT_CODE, -1.0);
        //     return;
        // };
        //
        // let mut stdout_buf = Vec::with_capacity(512);
        // let mut stderr_buf = Vec::with_capacity(512);
        // let mut stdout_pipe = child.stdout.take();
        // let mut stderr_pipe = child.stderr.take();
        //
        // thread::scope(|s| {
        //     if let Some(mut pipe) = stdout_pipe.take() {
        //         s.spawn({
        //             let max_bytes = self.stdout_max;
        //             let buf = &mut stdout_buf;
        //             move || {
        //                 let mut handle = pipe.by_ref().take(max_bytes as u64);
        //                 let _ = handle.read_to_end(buf);
        //             }
        //         });
        //     }
        //
        //     if let Some(mut pipe) = stderr_pipe.take() {
        //         s.spawn({
        //             let max_bytes = self.stderr_max;
        //             let buf = &mut stderr_buf;
        //             move || {
        //                 let mut handle = pipe.by_ref().take(max_bytes as u64);
        //                 let _ = handle.read_to_end(buf);
        //             }
        //         });
        //     }
        //
        //     let start_instant = Instant::now();
        //
        //     loop {
        //         match child.try_wait() {
        //             Ok(Some(status)) => {
        //                 if let Some(code) = status.code() {
        //                     exit_code = code;
        //                 }
        //                 break;
        //             }
        //             Ok(None) => {
        //                 if start_instant.elapsed() >= timeout {
        //                     let _ = child.kill();
        //                     let _ = child.wait();
        //                     break;
        //                 }
        //                 thread::sleep(Duration::from_millis(1));
        //             }
        //             Err(_) => {
        //                 let _ = child.kill();
        //                 let _ = child.wait();
        //                 break;
        //             }
        //         }
        //     }
        // });
        //
        // emit(M_EXIT_CODE, exit_code as f64);
    }
}
