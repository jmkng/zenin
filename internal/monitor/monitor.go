package monitor

import (
	"context"
	"fmt"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
)

const (
	RemoteAddressInvalidMessage string = "Remote address may be invalid."
	TimeoutMessage              string = "The monitor timed out."
)

type HTTPRange = string

const (
	Informational HTTPRange = "100-199"
	Successful    HTTPRange = "200-299"
	Redirection   HTTPRange = "300-399"
	ClientError   HTTPRange = "400-499"
	ServerError   HTTPRange = "500-599"
)

type HTTPMethod = string

const (
	Get    HTTPMethod = "GET"
	Head   HTTPMethod = "HEAD"
	Post   HTTPMethod = "POST"
	Put    HTTPMethod = "PUT"
	Patch  HTTPMethod = "PATCH"
	Delete HTTPMethod = "GET"
)

// Probe is a type used to build a `Span` describing the state of a resource.
type Probe interface {
	// Poll will execute an action that returns a `Span` describing the result.
	//
	// No error is returned because this should be an infallible operation,
	// meaning any validation errors on a type that implements `Probe` should be caught
	// ahead of time.
	//
	// Anything that might look like an "error" should be represented as a `Span` with a
	// state of `Dead` or `Warn`.
	//
	// In this situation, the `Span` can be distributed normally, triggering alerts and
	// calling attention to the failure.
	Poll(m Monitor) measurement.Span
}

type ProtocolKind string

const (
	ICMP ProtocolKind = "ICMP"
	UDP  ProtocolKind = "UDP"
)

// Monitor is the monitor domain type.
type Monitor struct {
	Id            *int                  `json:"id" db:"monitor_id"`
	CreatedAt     time.Time             `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time             `json:"updatedAt" db:"updated_at"`
	Name          string                `json:"name" db:"name"`
	Kind          measurement.ProbeKind `json:"kind" db:"monitor_kind"`
	Active        bool                  `json:"active" db:"active"`
	Interval      int                   `json:"interval" db:"interval"`
	Timeout       int                   `json:"timeout" db:"timeout"`
	Description   *string               `json:"description" db:"description"`
	RemoteAddress *string               `json:"remoteAddress" db:"remote_address"`
	RemotePort    *int16                `json:"remotePort" db:"remote_port"`
	PluginFields
	HTTPFields
	ICMPFields
	Measurements []measurement.Measurement `json:"measurements"`
}

type PluginFields struct {
	PluginName *string              `json:"pluginName" db:"plugin_name"`
	PluginArgs *internal.ArrayValue `json:"pluginArgs" db:"plugin_args"`
}

type HTTPFields struct {
	HTTPRange  *HTTPRange `json:"httpRange" db:"http_range"`
	HTTPMethod *string    `json:"httpMethod" db:"http_method"`
	// HTTPRequestHeaders is a list of key/value pairs representing headers to send with the request.
	//
	// At the time of request, values for duplicate keys are combined by net/http.
	//
	// https://pkg.go.dev/net/http#Header.Add
	HTTPRequestHeaders *internal.PairListValue `json:"httpRequestHeaders" db:"http_request_headers"`
	HTTPRequestBody    *string                 `json:"httpRequestBody" db:"http_request_body"`
	HTTPExpiredCertMod *string                 `json:"httpExpiredCertMod" db:"http_expired_cert_mod"`
	HTTPCaptureHeaders *bool                   `json:"httpCaptureHeaders" db:"http_capture_headers"`
	HTTPCaptureBody    *bool                   `json:"httpCaptureBody" db:"http_capture_body"`
}

type ICMPFields struct {
	ICMPSize     *int          `json:"icmpSize" db:"icmp_size"`
	ICMPWait     *int          `json:"icmpWait" db:"icmp_wait"`
	ICMPCount    *int          `json:"icmpCount" db:"icmp_count"`
	ICMPTTL      *int          `json:"icmpTtl" db:"icmp_ttl"`
	ICMPProtocol *ProtocolKind `json:"icmpProtocol" db:"icmp_protocol"`
}

// Deadline returns a copy of the parent context with a timeout set according to
// the monitor `Timeout` field.
func (m Monitor) Deadline(ctx context.Context) (context.Context, context.CancelFunc) {
	deadline := time.Duration(m.Timeout) * time.Second
	ctx, cancel := context.WithTimeout(ctx, deadline)
	return ctx, cancel
}

// Poll will invoke a `Probe`, returning a `Measurement` describing the result.
//
// This function should only ever be called on a `Monitor` from the database,
// it requires essential fields (including id) to be populated.
func (m Monitor) Poll() measurement.Measurement {
	env.Debug("poll starting", "monitor(id)", *m.Id)

	var result measurement.Measurement
	result.MonitorId = m.Id

	var probe Probe
	switch m.Kind {
	case measurement.ICMP:
		probe = NewICMPProbe()
	case measurement.HTTP:
		probe = NewHTTPProbe()
	case measurement.TCP:
		probe = NewTCPProbe()
	case measurement.Plugin:
		probe = NewPluginProbe()
	default:
		panic("unrecognized probe")
	}

	start := time.Now()
	span := probe.Poll(m)
	span.Kind = m.Kind
	duration := float64(time.Since(start)) / float64(time.Millisecond)
	result.Span = span
	result.CreatedAt = start
	result.UpdatedAt = start
	result.Duration = duration

	env.Debug("poll stopping", "monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration),
		"state", result.State, "hint", result.StateHint)
	return result
}

// Validate will return an error if the `Monitor` is in an invalid state.
func (m Monitor) Validate() error {
	errors := []string{}
	push := func(value string) {
		message := fmt.Sprintf("value for field `%v` is required", value)
		errors = append(errors, message)
	}

	if m.Interval == 0 {
		push("interval")
	}
	if m.Timeout == 0 {
		push("timeout")
	}
	if m.Name == "" {
		push("name")
	}
	kind, err := measurement.ProbeKindFromString(string(m.Kind))
	if err != nil {
		push("kind")
	}
	switch kind {
	case measurement.HTTP:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
		if m.HTTPRange == nil {
			push("httpRange")
		}
	case measurement.TCP, measurement.ICMP:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
	case measurement.Plugin:
		if m.PluginName == nil {
			push("pluginName")
		}
	}

	if len(errors) > 0 {
		return env.NewValidation(errors...)
	}
	return nil
}
