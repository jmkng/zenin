use crate::string::{StringId, StringPool};

const M_EXIT_CODE: &str = "process.exit_code";

pub struct MetricHandles {
    exit_code: StringId,
}

impl MetricHandles {
    pub fn exit_code(&self) -> StringId {
        self.exit_code
    }
}

pub struct ProbeHandles {
    metric: MetricHandles,
}

impl ProbeHandles {
    pub fn register(dict: &mut StringPool) -> Self {
        Self {
            metric: MetricHandles {
                exit_code: dict.id(M_EXIT_CODE),
            },
        }
    }

    pub fn metric(&self) -> &MetricHandles {
        &self.metric
    }
}
