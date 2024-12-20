package monitor

import (
	"context"
	"net"
	"strconv"

	"github.com/jmkng/zenin/internal/measurement"
)

// NewTCPProbe returns a new `TCPProbe`
func NewTCPProbe() TCPProbe {
	return TCPProbe{}
}

type TCPProbe struct{}

// Poll implements `Probe.Poll` for `TCPProbe`.
func (i TCPProbe) Poll(ctx context.Context, monitor Monitor) measurement.Span {
	panic("todo")
}
