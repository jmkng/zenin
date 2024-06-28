package measurement

// Measurement represents the measurement domain type.
type Measurement struct {
	// The measurement ID.
	ID int `json:"id"`
	Span
}

type ProbeState string

const (
	OK   ProbeState = "OK"
	Warn ProbeState = "WARN"
	Dead ProbeState = "DEAD"
)

// Span contains information on the result of a poll operation.
type Span struct {
	MonitorID           int        `json:"monitorId"`
	RecordedAt          int        `json:"recordedAt"`
	State               ProbeState `json:"state"`
	Duration            float64    `json:"duration"`
	HTTPStatusCode      int        `json:"httpStatusCode"`
	HTTPResponseHeaders string     `json:"httpResponseHeaders"`
	HTTPResponseBody    string     `json:"httpResponseBody"`
	ICMPPacketsIn       int        `json:"icmpPacketsIn"`
	ICMPPacketsOut      int        `json:"icmpPacketsOut"`
	ICMPMinRTT          float64    `json:"icmpMinRtt"`
	ICMPAvgRTT          float64    `json:"icmpAvgRtt"`
	ICMPMaxRTT          float64    `json:"icmpMaxRtt"`
	ScriptExitCode      int        `json:"scriptExitCode"`
	ScriptStdout        string     `json:"scriptStdout"`
	ScriptStderr        string     `json:"scriptStderr"`
}

func (s Span) Measurement(id int) Measurement {
	return Measurement{
		ID:   id,
		Span: s,
	}
}
