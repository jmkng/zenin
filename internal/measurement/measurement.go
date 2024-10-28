package measurement

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jmkng/zenin/internal"
)

type ProbeState string

const (
	Ok   ProbeState = "OK"
	Warn ProbeState = "WARN"
	Dead ProbeState = "DEAD"
)

// Measurement is the measurement domain type.
type Measurement struct {
	Id        *int      `json:"id" db:"measurement_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	MonitorId *int      `json:"monitorId" db:"measurement_monitor_id"`
	Duration  float64   `json:"duration" db:"duration"`
	Span
}

// NewSpan returns a new `Span` with the provided default state.
// `Certificates` is an empty slice. All other fields are nil.
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

type ArrayValue []string

// Value implements `driver.Valuer` for `ArrayValue`.
func (h ArrayValue) Value() (driver.Value, error) {
	return json.Marshal(h)
}

// Scan implements `sql.Scanner` for `ArrayValue`.
// This allows storing and fetching the `ArrayValue` as a JSON array.
func (h *ArrayValue) Scan(value any) error {
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
	State ProbeState `json:"state" db:"state"`
	// StateHint is a series of user-friendly messages which indicate why a Span was given a state.
	StateHint    ArrayValue    `json:"stateHint" db:"state_hint"`
	Kind         ProbeKind     `json:"kind" db:"measurement_kind"`
	Certificates []Certificate `json:"-"`

	HTTPFields
	ICMPFields
	PluginFields
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

type ProbeKind string

const (
	HTTP   ProbeKind = "HTTP"
	TCP    ProbeKind = "TCP"
	ICMP   ProbeKind = "ICMP"
	Plugin ProbeKind = "PLUGIN"
)

// ProbeKindFromString returns an equivalent `ProbeKind` from the provided string.
// The value parameter is normalized to lowercase.
func ProbeKindFromString(value string) (ProbeKind, error) {
	switch strings.ToLower(value) {
	case "http":
		return HTTP, nil
	case "tcp":
		return TCP, nil
	case "icmp":
		return ICMP, nil
	case "plugin":
		return Plugin, nil
	default:
		return "", errors.New("invalid monitor kind")
	}
}

type HTTPFields struct {
	HTTPStatusCode      *int                    `json:"httpStatusCode" db:"http_status_code"`
	HTTPResponseHeaders *internal.PairListValue `json:"httpResponseHeaders" db:"http_response_headers"`
	HTTPResponseBody    *string                 `json:"httpResponseBody" db:"http_response_body"`
}

type ICMPFields struct {
	ICMPPacketsIn  *int     `json:"icmpPacketsIn" db:"icmp_packets_in"`
	ICMPPacketsOut *int     `json:"icmpPacketsOut" db:"icmp_packets_out"`
	ICMPMinRTT     *float64 `json:"icmpMinRtt" db:"icmp_min_rtt"`
	ICMPAvgRTT     *float64 `json:"icmpAvgRtt" db:"icmp_avg_rtt"`
	ICMPMaxRTT     *float64 `json:"icmpMaxRtt" db:"icmp_max_rtt"`
}

type PluginFields struct {
	PluginExitCode *int    `json:"pluginExitCode" db:"plugin_exit_code"`
	PluginStdout   *string `json:"pluginStdout" db:"plugin_stdout"`
	PluginStderr   *string `json:"pluginStderr" db:"plugin_stderr"`
}

// Certificate is an x509 certificate recorded by an HTTP probe.
type Certificate struct {
	Id                 *int      `json:"id" db:"certificate_id"`
	CreatedAt          time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt          time.Time `json:"updatedAt" db:"updated_at"`
	MeasurementId      *int      `json:"measurementId" db:"certificate_measurement_id"`
	Version            int       `json:"version" db:"version"`
	SerialNumber       string    `json:"serialNumber" db:"serial_number"`
	PublicKeyAlgorithm string    `json:"publicKeyAlgorithm" db:"public_key_algorithm"`
	IssuerCommonName   string    `json:"issuerCommonName" db:"issuer_common_name"`
	SubjectCommonName  string    `json:"subjectCommonName" db:"subject_common_name"`
	NotBefore          time.Time `json:"notBefore" db:"not_before"`
	NotAfter           time.Time `json:"notAfter" db:"not_after"`
}
