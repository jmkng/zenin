package measurement

import (
	"time"
)

// Measurement is the measurement domain type.
type Measurement struct {
	Id           *int          `json:"id" db:"id"`
	MonitorId    *int          `json:"monitorId" db:"monitor_id"`
	RecordedAt   time.Time     `json:"recordedAt" db:"recorded_at"`
	Duration     float64       `json:"duration" db:"duration"`
	State        ProbeState    `json:"state" db:"state"`
	StateHint    *StateHint    `json:"stateHint,omitempty" db:"state_hint"`
	Certificates []Certificate `json:"certificates,omitempty"`

	HTTPFields
	ICMPFields
	ScriptFields
}

// Finalize will return a `Measurement` with the state and duration properties set.
//
// # Panic
//
// This function will panic if the `RecordedAt` property has not been set.
func (m Measurement) Finalize(state ProbeState) Measurement {
	if m.RecordedAt.IsZero() {
		panic("span finalized without setting `RecordedAt` time")
	}
	m.State = state
	duration := time.Since(m.RecordedAt)
	m.Duration = float64(duration) / float64(time.Millisecond)
	return m
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

type ScriptFields struct {
	ScriptExitCode *int    `json:"scriptExitCode,omitempty" db:"script_exit_code"`
	ScriptStdout   *string `json:"scriptStdout,omitempty" db:"script_stdout"`
	ScriptStderr   *string `json:"scriptStderr,omitempty" db:"script_stderr"`
}

type ProbeState string

const (
	Ok   ProbeState = "OK"
	Warn ProbeState = "WARN"
	Dead ProbeState = "DEAD"
)

type StateHint string

const (
	Timeout StateHint = "TIMEOUT"
)

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
