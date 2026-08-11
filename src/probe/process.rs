#![allow(warnings)]

use crate::engine::{Engine, SeriesId, Type, Unit, Value};
use std::ffi::{OsStr, c_int};
use std::io::Read;
use std::os::fd::{AsRawFd, RawFd};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Default, Clone, Copy)]
pub struct StreamStats {
    pub bytes: f64,
    pub lines: f64,
}

impl StreamStats {
    #[inline]
    fn read(&mut self, bytes: &[u8]) {
        self.bytes += bytes.len() as f64;
        self.lines += bytes.iter().filter(|&&b| b == b'\n').count() as f64;
    }
}

struct ProcessHandles {
    ok: SeriesId,
    exit_code: SeriesId,
    stdout_bytes: SeriesId,
    stderr_bytes: SeriesId,
    stdout_lines: SeriesId,
    stderr_lines: SeriesId,
}

pub struct ProcessProbe {
    command: Command,
    timeout: Duration,
    handles: ProcessHandles,
}

impl ProcessProbe {
    pub fn new<T, U>(engine: &mut Engine, target: T, args: U, timeout: Duration) -> Self
    where
        T: AsRef<str>,
        U: IntoIterator,
        U::Item: AsRef<OsStr>,
    {
        let target = target.as_ref();
        let args = args.into_iter();

        let job_label = ("job", target.as_ref());
        let stdout_stream_label = ("stream", "stdout");
        let stderr_stream_label = ("stream", "stderr");

        let ok = engine.register_series("process.ok", [job_label], Unit::None, Type::Point);

        let exit_code =
            engine.register_series("process.exit_code", [job_label], Unit::Count, Type::Point);

        let stdout_bytes = engine.register_series(
            "process.bytes",
            [job_label, stdout_stream_label],
            Unit::Bytes,
            Type::Point,
        );

        let stderr_bytes = engine.register_series(
            "process.bytes",
            [job_label, stderr_stream_label],
            Unit::Bytes,
            Type::Point,
        );

        let stdout_lines = engine.register_series(
            "process.lines",
            [job_label, stdout_stream_label],
            Unit::Bytes,
            Type::Point,
        );

        let stderr_lines = engine.register_series(
            "process.bytes",
            [job_label, stderr_stream_label],
            Unit::Bytes,
            Type::Point,
        );

        let handles = ProcessHandles {
            ok,
            exit_code,
            stdout_bytes,
            stderr_bytes,
            stdout_lines,
            stderr_lines,
        };

        let mut command = Command::new(&target);
        _ = command.args(args);
        _ = command.stdout(Stdio::piped());
        _ = command.stderr(Stdio::piped());

        Self {
            command,
            timeout,
            handles,
        }
    }

    pub fn sample(&mut self, mut emit: impl FnMut(SeriesId, Value)) {
        let start = Instant::now();

        let Ok(mut child) = self.command.spawn() else {
            emit(self.handles.exit_code, -1.0);
            emit(self.handles.ok, 0.0);
            return;
        };

        let mut stdout_pipe = child.stdout.take();
        let mut stderr_pipe = child.stderr.take();

        if let Some(ref pipe) = stdout_pipe {
            set_nonblocking(pipe.as_raw_fd());
        }
        if let Some(ref pipe) = stderr_pipe {
            set_nonblocking(pipe.as_raw_fd());
        }

        let mut poll_fds = [
            pollfd {
                fd: stdout_pipe.as_ref().map(|p| p.as_raw_fd()).unwrap_or(-1),
                events: POLLIN,
                revents: 0,
            },
            pollfd {
                fd: stderr_pipe.as_ref().map(|p| p.as_raw_fd()).unwrap_or(-1),
                events: POLLIN,
                revents: 0,
            },
        ];

        let mut stdout_stats = StreamStats::default();
        let mut stderr_stats = StreamStats::default();

        // Streams stdout/stderr are not stored anywhere,
        // but some metrics are derived from reading them,
        // so that is what this buffer is for.
        let mut buf = [0u8; 2048];

        let mut exit_code = -1.0;
        let mut timed_out = false;

        loop {
            let elapsed = start.elapsed();
            if elapsed >= self.timeout {
                timed_out = true;
                let _ = child.kill();
                let _ = child.wait();
                break;
            }

            let remaining_ms = (self.timeout - elapsed).as_millis().min(50) as i32;
            let ret = unsafe { poll(poll_fds.as_mut_ptr(), 2, remaining_ms) };

            // Read streams
            if ret > 0 {
                if poll_fds[0].revents & (POLLIN | POLLHUP) != 0 {
                    if let Some(ref mut pipe) = stdout_pipe {
                        match pipe.read(&mut buf) {
                            Ok(n) => stdout_stats.read(&buf[..n]),
                            Ok(0) | Err(_) => poll_fds[0].fd = -1,
                            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                        }
                    }
                }

                if poll_fds[1].revents & (POLLIN | POLLHUP) != 0 {
                    if let Some(ref mut pipe) = stderr_pipe {
                        match pipe.read(&mut buf) {
                            Ok(n) => stderr_stats.read(&buf[..n]),
                            Ok(0) | Err(_) => poll_fds[1].fd = -1,
                            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                        }
                    }
                }
            }

            match child.try_wait() {
                Ok(Some(status)) => {
                    drain(&mut stdout_pipe, &mut buf, &mut stdout_stats);
                    drain(&mut stderr_pipe, &mut buf, &mut stderr_stats);

                    if let Some(code) = status.code() {
                        exit_code = code as f64;
                    }
                    break;
                }
                Ok(None) => {}
                Err(_) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    break;
                }
            }
        }

        let is_ok = if !timed_out && exit_code == 0.0 {
            1.0
        } else {
            0.0
        };

        emit(self.handles.exit_code, exit_code);
        emit(self.handles.ok, is_ok);
        emit(self.handles.stdout_bytes, stdout_stats.bytes);
        emit(self.handles.stdout_lines, stdout_stats.lines);
        emit(self.handles.stderr_bytes, stderr_stats.bytes);
        emit(self.handles.stderr_lines, stderr_stats.lines);
    }
}

fn drain<R: Read>(pipe: &mut Option<R>, buf: &mut [u8], stats: &mut StreamStats) {
    if let Some(p) = pipe {
        while let Ok(n) = p.read(buf) {
            if n == 0 {
                break;
            }
            stats.read(&buf[..n]);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// FFI
////////////////////////////////////////////////////////////////////////////////

#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct pollfd {
    pub fd: RawFd,
    pub events: i16,
    pub revents: i16,
}

pub const POLLIN: i16 = 0x0001;
pub const POLLHUP: i16 = 0x0010;

pub const F_GETFL: c_int = 3;
pub const F_SETFL: c_int = 4;

#[cfg(target_os = "linux")]
pub const O_NONBLOCK: c_int = 04000;

#[cfg(not(target_os = "linux"))]
pub const O_NONBLOCK: c_int = 0x00000004;

unsafe extern "C" {
    pub fn poll(fds: *mut pollfd, nfds: usize, timeout: c_int) -> c_int;
    pub fn fcntl(fildes: RawFd, cmd: c_int, ...) -> c_int;
}

fn fcntl_get(fd: RawFd, cmd: c_int) -> c_int {
    unsafe { fcntl(fd, cmd) }
}

fn fcntl_set(fd: RawFd, cmd: c_int, arg: c_int) -> c_int {
    unsafe { fcntl(fd, cmd, arg) }
}

fn set_nonblocking(fd: RawFd) {
    let flags = fcntl_get(fd, F_GETFL);
    if flags >= 0 {
        let _ = fcntl_set(fd, F_SETFL, flags | O_NONBLOCK);
    }
}
