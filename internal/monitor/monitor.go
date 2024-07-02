package monitor

import (
	"errors"
	"fmt"
	"time"

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

type Monitor struct {
	Id     *int      `json:"id" db:"id"`
	Name   string    `json:"name" db:"name"`
	Kind   ProbeKind `json:"kind" db:"kind"`
	Active bool      `json:"active" db:"active"`
	// The time between each poll. (seconds)
	Interval int `json:"interval" db:"interval"`
	// The time to wait for a poll to complete before it is considered dead. (seconds)
	Timeout            int                       `json:"timeout" db:"timeout"`
	Description        *string                   `json:"description" db:"description"`
	RemoteAddress      *string                   `json:"remoteAddress" db:"remote_address"`
	RemotePort         *int16                    `json:"remotePort" db:"remote_port"`
	ScriptPath         *string                   `json:"scriptPath" db:"script_path"`
	HTTPRange          *HTTPRange                `json:"httpRange" db:"http_range"`
	HTTPMethod         *string                   `json:"httpMethod" db:"http_method"`
	HTTPHeaders        *string                   `json:"httpHeaders" db:"http_request_headers"`
	HTTPBody           *string                   `json:"httpBody" db:"http_request_body"`
	HTTPExpiredCertMod *string                   `json:"httpExpiredCertMod" db:"http_expired_cert_mod"`
	ICMPSize           *int                      `json:"icmpSize" db:"icmp_size"`
	Measurements       []measurement.Measurement `json:"measurements"`
}

// ValidationError is an error received when a monitor is being polled in an invalid state.
//
// Validation problems should be caught early on, when the monitor is created and stored,
// so this error should not happen in reality.
//
// If it does happen, this will indicate an internal issue.
var ValidationError = errors.New("probe was stopped by invalid monitor")

// Poll will start a poll action, returning a `Span` for the result.
func (m Monitor) Poll() (measurement.Measurement, error) {
	log.Debug("poll starting", "monitor(id)", *m.Id)

	var measurement measurement.Measurement
	var err error

	start := time.Now()
	switch m.Kind {
	case ICMP:
		measurement, err = NewICMPProbe(false).Poll(m)
	case HTTP:
		measurement, err = NewHTTPProbe().Poll(m)
	case TCP:
		measurement, err = NewTCPProbe().Poll(m)
	case Script:
		measurement, err = NewScriptProbe().Poll(m)
	case Ping:
		measurement, err = NewICMPProbe(true).Poll(m)
	default:
		panic("unrecognized probe")
	}
	if err != nil {
		return measurement, err
	}

	diff := time.Since(start)
	duration := float64(diff) / float64(time.Millisecond)

	log.Debug("poll stopping", "monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration))
	return measurement, nil
}
