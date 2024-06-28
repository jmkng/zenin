package monitor

import "github.com/jmkng/zenin/internal/measurement"

// NewTCPProbe returns a new `TCPProbe`
func NewTCPProbe() TCPProbe {
	return TCPProbe{}
}

type TCPProbe struct {
}

// Poll implements `Probe.Poll` for `TCPProbe`.
func (i TCPProbe) Poll(monitor Monitor) measurement.Span {
	panic("todo")
}
