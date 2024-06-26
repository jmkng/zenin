package measurement

import "time"

// MeasurementRepository is a type used to interact with the measurement domain
// database table.
type MeasurementRepository interface {
}

type ProbeState string

const (
	OK   ProbeState = "OK"
	Warn ProbeState = "WARN"
	Dead ProbeState = "DEAD"
)

type Span struct {
	MonitorID  int        `json:"monitorId"`
	State      ProbeState `json:"state"`
	RecordedAt time.Time  `json:"recordedAt"`
}

func (s Span) Measurement(id int) Measurement {
	return Measurement{
		ID:   id,
		Span: s,
	}
}
