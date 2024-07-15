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
	Script ProbeKind = "SCRIPT"
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
	case "script":
		return Script, nil
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

type Probe interface {
	Poll(monitor Monitor) (measurement.Measurement, error)
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
	ScriptPath         *string                   `json:"scriptPath,omitempty" db:"script_path"`
	HTTPRange          *HTTPRange                `json:"httpRange,omitempty" db:"http_range"`
	HTTPMethod         *string                   `json:"httpMethod,omitempty" db:"http_method"`
	HTTPRequestHeaders *string                   `json:"httpRequestHeaders,omitempty" db:"http_request_headers"`
	HTTPRequestBody    *string                   `json:"httpRequestBody,omitempty" db:"http_request_body"`
	HTTPExpiredCertMod *string                   `json:"httpExpiredCertMod,omitempty" db:"http_expired_cert_mod"`
	ICMPSize           *int                      `json:"icmpSize,omitempty" db:"icmp_size"`
	Measurements       []measurement.Measurement `json:"measurements,omitempty"`
}

// Poll will start a poll action, returning a `Span` for the result.
func (m Monitor) Poll() (measurement.Measurement, error) {
	log.Debug("poll starting", "monitor(id)", *m.Id)
	var err error

	var result measurement.Measurement
	result.MonitorId = m.Id

	var span measurement.Span
	start := time.Now()
	switch m.Kind {
	case ICMP:
		span, err = NewICMPProbe(false).Poll(m)
	case HTTP:
		span, err = NewHTTPProbe().Poll(m)
	case TCP:
		span, err = NewTCPProbe().Poll(m)
	case Script:
		span, err = NewScriptProbe().Poll(m)
	case Ping:
		span, err = NewICMPProbe(true).Poll(m)
	default:
		panic("unrecognized probe")
	}
	if err != nil {
		return result, err
	}
	duration := float64(time.Since(start)) / float64(time.Millisecond)

	result.RecordedAt = start
	result.Duration = duration
	result.Span = span

	log.Debug("poll stopping", "monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration))
	return result, nil
}

// Validate will return an error if the `Monitor` is in an invalid state.
func (m Monitor) Validate() error {
	errors := []string{}
	push := func(value string) {
		message := fmt.Sprintf("value for field `%v` is required", value)
		errors = append(errors, message)
	}

	switch m.Kind {
	case HTTP:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
		if m.HTTPRange == nil {
			push("httpRange")
		}
	case TCP:
	case ICMP:
	case Ping:
		if m.RemoteAddress == nil {
			push("remoteAddress")
		}
	case Script:
		if m.ScriptPath == nil {
			push("scriptPath")
		}
	}

	if len(errors) > 0 {
		return internal.NewValidation(errors...)
	}
	return nil
}

// ValidationError is an error received when a monitor is being polled in an invalid state.
//
// Validation problems should be caught early on, when the monitor is created and stored,
// so this error should not happen in reality.
//
// If it does happen, this will indicate an internal issue.
var ValidationError = errors.New("probe was stopped by invalid monitor")
