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
func (i TCPProbe) Poll(ctx context.Context, m Monitor) measurement.Span {
	span := measurement.NewSpan()
	address := net.JoinHostPort(*m.RemoteAddress, strconv.Itoa(int(*m.RemotePort)))

	// Check remote address.
	_, err := net.ResolveTCPAddr("tcp", address)
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	dialer := net.Dialer{}

	conn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		span.Downgrade(measurement.Dead)

		if err.(net.Error).Timeout() {
			// Timeout.

			// TODO: This is common when you hit a firewall. Add another hint?
			span.Hint(TimeoutMessage)
		} else {
			// Connection refused. Might be [RST] from a closed port, or the host is down.
			span.Hint("Unable to establish connection.")
		}
		return span
	}
	defer conn.Close()

	return span
}
