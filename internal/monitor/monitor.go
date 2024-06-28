package monitor

import (
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

type Probe interface {
	Poll(monitor Monitor) measurement.Span
}

type Monitor struct {
	Id int
	Strategy
}

// Poll will start a poll action, returning a `Span` for the result.
func (m Monitor) Poll() measurement.Span {
	log.Debug("poll starting", "monitor(id)", m.Id)
	var span measurement.Span

	start := time.Now()
	switch x := m.Strategy.Kind; x {
	case ICMP:
		span = NewICMPProbe(false).Poll(m)
	case HTTP:
		span = NewHTTPProbe().Poll(m)
	case TCP:
		span = NewTCPProbe().Poll(m)
	case Script:
		span = NewScriptProbe().Poll(m)
	case Ping:
		span = NewICMPProbe(true).Poll(m)
	default:
		panic("unrecognized probe")
	}
	diff := time.Since(start)
	duration := float64(diff) / float64(time.Millisecond)

	log.Debug("poll stopping", "monitor(id)", m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration))
	return span
}

// Strategy describes how a monitor is polled.
type Strategy struct {
	Name   string
	Kind   ProbeKind
	Active bool
	// The time between each poll. (seconds)
	Interval int
	// The time to wait for a poll to complete before it is considered dead. (seconds)
	Timeout            int
	Description        *string
	RemoteAddress      *string
	RemotePort         *int16
	ScriptPath         *string
	HTTPRange          *HTTPRange
	HTTPMethod         *string
	HTTPHeaders        *string
	HTTPBody           *string
	HTTPExpiredCertMod *string
	ICMPSize           *int
}
