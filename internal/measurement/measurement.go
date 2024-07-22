package measurement

import (
	"encoding/json"
	"time"
)

type ProbeState string

const (
	Ok   ProbeState = "OK"
	Warn ProbeState = "WARN"
	Dead ProbeState = "DEAD"
)

// Measurement is the measurement domain type.
type Measurement struct {
	Id         *int      `json:"id" db:"id"`
	MonitorId  *int      `json:"monitorId" db:"monitor_id"`
	RecordedAt time.Time `json:"recordedAt" db:"recorded_at"`
	Duration   float64   `json:"duration" db:"duration"`
	Span
}

// NewSpan returns a new `Span`.
//
// The default `State` is `Dead`. `Certificates` is an empty slice. All other fields are nil.
func NewSpan(state ProbeState) Span {
	return Span{
		State:        state,
		StateHint:    []string{},
		Certificates: []Certificate{},
		HTTPFields:   HTTPFields{},
		ICMPFields:   ICMPFields{},
		PluginFields: PluginFields{},
	}
}

// Hint is a series of user-friendly messages that may indicate how a Probe was created.
type Hint []string

// Scan implements `sql.Scanner` for `Hint`.
// This allows storing and fetching the `Hint` as a JSON array.
func (h *Hint) Scan(value any) error {
	if value == nil {
		*h = []string{}
		return nil
	}
	var err error
	switch x := value.(type) {
	case string:
		err = json.Unmarshal([]byte(x), h)
	case []byte:
		err = json.Unmarshal(x, h)
	}
	return err
}

// Span is a common set of fields for all `Measurement`.
type Span struct {
	State        ProbeState    `json:"state" db:"state"`
	StateHint    Hint          `json:"stateHint,omitempty" db:"state_hint"`
	Certificates []Certificate `json:"certificates,omitempty"`

	HTTPFields
	ICMPFields
	PluginFields
}

type HTTPFields struct {
	HTTPStatusCode      *int    `json:"httpStatusCode,omitempty" db:"http_status_code"`
	HTTPResponseHeaders *string `json:"httpResponseHeaders,omitempty" db:"http_response_headers"`
	HTTPResponseBody    *string `json:"httpResponseBody,omitempty" db:"http_response_body"`
}

type ICMPFields struct {
	ICMPPacketsIn  *int     `json:"icmpPacketsIn,omitempty" db:"icmp_packets_in"`
	ICMPPacketsOut *int     `json:"icmpPacketsOut,omitempty" db:"icmp_packets_out"`
	ICMPMinRTT     *float64 `json:"icmpMinRtt,omitempty" db:"icmp_min_rtt"`
	ICMPAvgRTT     *float64 `json:"icmpAvgRtt,omitempty" db:"icmp_avg_rtt"`
	ICMPMaxRTT     *float64 `json:"icmpMaxRtt,omitempty" db:"icmp_max_rtt"`
}

type PluginFields struct {
	PluginExitCode *int    `json:"pluginExitCode,omitempty" db:"plugin_exit_code"`
	PluginStdout   *string `json:"pluginStdout,omitempty" db:"plugin_stdout"`
	PluginStderr   *string `json:"pluginStderr,omitempty" db:"plugin_stderr"`
}

// Downgrade will set `State` to the provided value if it is "below" the current state.
//
// For example, going from `Ok` to `Warn` or `Dead` is allowed,
// but going from `Dead` to `Warn` is ignored.
func (s *Span) Downgrade(state ProbeState, hint ...string) {
	if s.State == Ok {
		s.State = state
	} else if s.State == Warn && state == Dead {
		s.State = Dead
	}
	for _, v := range hint {
		s.StateHint = append(s.StateHint, v)
	}
}

// Hint will add hints to the `Span`.
func (s *Span) Hint(hint ...string) {
	s.StateHint = append(s.StateHint, hint...)
}

// Certificate is an x509 certificate recorded by an HTTP probe.
type Certificate struct {
	Id                 *int      `json:"id" db:"id"`
	MeasurementId      *int      `json:"measurementId" db:"measurement_id"`
	Version            int       `json:"version" db:"version"`
	SerialNumber       string    `json:"serialNumber" db:"serial_number"`
	PublicKeyAlgorithm string    `json:"publicKeyAlgorithm" db:"public_key_algorithm"`
	IssuerCommonName   string    `json:"issuerCommonName" db:"issuer_common_name"`
	SubjectCommonName  string    `json:"subjectCommonName" db:"subject_common_name"`
	NotBefore          time.Time `json:"notBefore" db:"not_before"`
	NotAfter           time.Time `json:"notAfter" db:"not_after"`
}
