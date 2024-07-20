package monitor

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/measurement"
)

type ProbeKind string

const (
	HTTP   ProbeKind = "HTTP"
	TCP    ProbeKind = "TCP"
	ICMP   ProbeKind = "ICMP"
	Ping   ProbeKind = "PING"
	Plugin ProbeKind = "PLUGIN"
)

func ProbeKindFromString(value string) (ProbeKind, error) {
	switch strings.ToLower(value) {
	case "http":
		return HTTP, nil
	case "tcp":
		return TCP, nil
	case "icmp":
		return ICMP, nil
	case "ping":
		return Ping, nil
	case "plugin":
		return Plugin, nil
	default:
		return "", errors.New("invalid monitor kind")
	}
}

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
	Poll(monitor Monitor) measurement.Span
}

// Monitor is the monitor domain type.
type Monitor struct {
	Id                 *int                      `json:"id" db:"id"`
	Name               string                    `json:"name" db:"name"`
	Kind               ProbeKind                 `json:"kind" db:"kind"`
	Active             bool                      `json:"active" db:"active"`
	Interval           int                       `json:"interval" db:"interval"`
	Timeout            int                       `json:"timeout" db:"timeout"`
	Description        *string                   `json:"description,omitempty" db:"description"`
	RemoteAddress      *string                   `json:"remoteAddress,omitempty" db:"remote_address"`
	RemotePort         *int16                    `json:"remotePort,omitempty" db:"remote_port"`
	PluginName         *string                   `json:"pluginName,omitempty" db:"plugin_name"`
	PluginArgs         *string                   `json:"pluginArgs,omitempty" db:"plugin_args"`
	HTTPRange          *HTTPRange                `json:"httpRange,omitempty" db:"http_range"`
	HTTPMethod         *string                   `json:"httpMethod,omitempty" db:"http_method"`
	HTTPRequestHeaders *string                   `json:"httpRequestHeaders,omitempty" db:"http_request_headers"`
	HTTPRequestBody    *string                   `json:"httpRequestBody,omitempty" db:"http_request_body"`
	HTTPExpiredCertMod *string                   `json:"httpExpiredCertMod,omitempty" db:"http_expired_cert_mod"`
	ICMPSize           *int                      `json:"icmpSize,omitempty" db:"icmp_size"`
	Measurements       []measurement.Measurement `json:"measurements,omitempty"`
}

func (m Monitor) Fields() []any {
	fields := []any{}
	fields = append(fields, "name", m.Name, "kind", m.Kind, "timeout", m.Timeout)
	if m.Kind != Plugin {
		fields = append(fields, "address", *m.RemoteAddress)
		if m.RemotePort != nil {
			fields = append(fields, "port", *m.RemotePort)
		}
	}
	switch m.Kind {
	case HTTP:
		fields = append(fields, "range", *m.HTTPRange, "method", *m.HTTPMethod)
	case ICMP:
		fields = append(fields, "packet(bytes)", *m.ICMPSize)
	case Plugin:
		fields = append(fields, "name", *m.PluginName, "args", m.PluginArgs)
	}

	return fields
}

// Poll will invoke a `Probe`, returning a `Measurement` describing the result.
//
// This function should only ever be called on a `Monitor` from the database,
// it requires essential fields (including id) to be populated.
func (m Monitor) Poll() measurement.Measurement {
	fields := append([]any{"monitor(id)", *m.Id}, m.Fields()...)
	log.Debug("poll starting", fields...)

	var result measurement.Measurement
	result.MonitorId = m.Id

	var probe Probe
	switch m.Kind {
	case ICMP:
		probe = NewICMPProbe(false)
	case HTTP:
		probe = NewHTTPProbe()
	case TCP:
		probe = NewTCPProbe()
	case Plugin:
		probe = NewPluginProbe()
	case Ping:
		probe = NewICMPProbe(true)
	default:
		panic("unrecognized probe")
	}

	start := time.Now()
	span := probe.Poll(m)
	duration := float64(time.Since(start)) / float64(time.Millisecond)
	result.RecordedAt = start
	result.Duration = duration
	result.Span = span

	log.Debug("poll stopping",
		"monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration),
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
	kind, err := ProbeKindFromString(string(m.Kind))
	if err != nil {
		push("kind")
	}
	switch kind {
	case HTTP:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
		if m.HTTPRange == nil {
			push("httpRange")
		}
	case TCP, ICMP, Ping:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
	case Plugin:
		if m.PluginName == nil {
			push("pluginName")
		}
	}

	if len(errors) > 0 {
		return internal.NewValidation(errors...)
	}
	return nil
}
