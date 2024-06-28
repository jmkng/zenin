package repository

import (
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// MonitorRow is a `Monitor` with an optional `Measurement`,
// representing a joined row from the measurement table.
type MonitorRow struct {
	monitor.Monitor
	Measurement *measurement.Measurement
}
