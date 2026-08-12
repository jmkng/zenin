use crate::engine::{Engine, SeriesId, Type, Unit, Value};
use crate::medic::{
    MedicCpuStat,
    medic_cpu_agg_stat,
    medic_cpu_num_logical,
    medic_cpu_stat_stream,
};
use std::ffi::c_void;

#[derive(Default)]
pub struct CoreHandles {
    pub user: SeriesId,
    pub system: SeriesId,
    pub nice: SeriesId,
    pub idle: SeriesId,
}

pub struct MedicCpuProbe {
    pub total: CoreHandles,
    pub per_core: Vec<CoreHandles>,
}

impl MedicCpuProbe {
    pub fn new(engine: &mut Engine) -> Self {
        let total = CoreHandles {
            user: engine.register_series(
                "cpu.time",
                [("mode", "user")],
                Unit::Seconds,
                Type::Monotonic,
            ),
            system: engine.register_series(
                "cpu.time",
                [("mode", "system")],
                Unit::Seconds,
                Type::Monotonic,
            ),
            nice: engine.register_series(
                "cpu.time",
                [("mode", "nice")],
                Unit::Seconds,
                Type::Monotonic,
            ),
            idle: engine.register_series(
                "cpu.time",
                [("mode", "idle")],
                Unit::Seconds,
                Type::Monotonic,
            ),
        };

        // cpu.time{core,"mode="user|system|nice|idle"}
        let mut reg_core = |core: &str| -> CoreHandles {
            CoreHandles {
                user: engine.register_series(
                    "cpu.time",
                    [("core", core), ("mode", "user")],
                    Unit::Seconds,
                    Type::Monotonic,
                ),
                system: engine.register_series(
                    "cpu.time",
                    [("core", core), ("mode", "system")],
                    Unit::Seconds,
                    Type::Monotonic,
                ),
                nice: engine.register_series(
                    "cpu.time",
                    [("core", core), ("mode", "nice")],
                    Unit::Seconds,
                    Type::Monotonic,
                ),
                idle: engine.register_series(
                    "cpu.time",
                    [("core", core), ("mode", "idle")],
                    Unit::Seconds,
                    Type::Monotonic,
                ),
            }
        };

        let detected = unsafe { medic_cpu_num_logical() }.max(1) as usize;

        let mut per_core: Vec<CoreHandles> = Vec::with_capacity(detected);

        for i in 0..detected {
            let core_name = i.to_string();
            per_core.push(reg_core(&core_name));
        }

        Self { total, per_core }
    }

    pub fn sample(&mut self, mut emit: impl FnMut(SeriesId, Value)) {
        unsafe {
            let mut meds: MedicCpuStat = std::mem::zeroed();
            if medic_cpu_agg_stat(&mut meds) == 0 {
                emit(self.total.user, meds.user);
                emit(self.total.system, meds.system);
                emit(self.total.nice, meds.nice);
                emit(self.total.idle, meds.idle);
            }

            let mut core_num = 0;
            stream_cpu_stats(|stat| {
                emit(self.per_core[core_num].user, stat.user);
                emit(self.per_core[core_num].system, stat.system);
                emit(self.per_core[core_num].nice, stat.nice);
                emit(self.per_core[core_num].idle, stat.idle);
                core_num += 1;
            });
        }
    }
}

extern "C" fn stream_cb<F: FnMut(&MedicCpuStat)>(cpu: *const MedicCpuStat, data: *mut c_void) {
    unsafe {
        if !cpu.is_null() && !data.is_null() {
            let closure = &mut *(data as *mut F);
            closure(&*cpu);
        }
    }
}

pub fn stream_cpu_stats<F>(mut callback: F) -> Result<(), i32>
where
    F: FnMut(&MedicCpuStat),
{
    let data_ptr = &mut callback as *mut F as *mut c_void;
    let ret = unsafe { medic_cpu_stat_stream(Some(stream_cb::<F>), data_ptr) };

    if ret == 0 { Ok(()) } else { Err(ret) }
}
