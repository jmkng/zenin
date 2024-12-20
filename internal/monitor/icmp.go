package monitor

import (
	"context"
	"errors"
	"runtime"
	"time"

	"github.com/jmkng/zenin/internal/measurement"
	icmp "github.com/prometheus-community/pro-bing"
)

// NewICMPProbe returns a new `ICMPProbe`
func NewICMPProbe() ICMPProbe {
	return ICMPProbe{}
}

type ICMPProbe struct{}

// Poll implements `Probe.Poll` for `ICMPProbe`.
func (i ICMPProbe) Poll(ctx context.Context, m Monitor) measurement.Span {
	span := measurement.NewSpan()

	// Check remote address.
	client := icmp.New(*m.RemoteAddress)
	err := client.Resolve()
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	privileged := false

	// ICMP/UDP protocol switch.
	//
	// Required on Windows.
	//
	// On Unix systems, privileged (ICMP) execution is optional,
	// but will fail without root.
	if *m.ICMPProtocol == ICMP {
		privileged = true
	}

	if privileged {
		client.SetPrivileged(true)
	}

	client.Size = *m.ICMPSize
	client.Interval = time.Millisecond * time.Duration(*m.ICMPWait)
	client.Count = *m.ICMPCount
	client.TTL = *m.ICMPTTL

	err = client.RunWithContext(ctx)

	stats := client.Statistics()
	out := stats.PacketsSent
	in := stats.PacketsRecv
	min := stats.MinRtt.Seconds() * 1000
	avg := stats.AvgRtt.Seconds() * 1000
	max := stats.MaxRtt.Seconds() * 1000

	if err != nil {
		// Assumes no messages are sent out on a genuine error.
		if out == 0 {
			span.Downgrade(measurement.Dead)
		}

		if errors.Is(err, context.DeadlineExceeded) {
			span.Hint(TimeoutMessage)
		}

		if *m.ICMPProtocol == ICMP {
			if runtime.GOOS != "windows" {
				span.Hint("Ensure process has root privilege.")
			}
		} else {
			if runtime.GOOS == "windows" {
				span.Hint("UDP protocol is unsupported on Windows systems.")
			}
		}
	}

	span.ICMPPacketsOut = &out
	span.ICMPPacketsIn = &in
	span.ICMPMinRTT = &min
	span.ICMPAvgRTT = &avg
	span.ICMPMaxRTT = &max

	// Timing sanity check.
	if (*m.ICMPCount)*(*m.ICMPWait)/1000 > m.Timeout {
		span.Downgrade(measurement.Warn)
		span.Hint("Timeout may be insufficient to complete probe.")
	}

	if stats.PacketLoss == 100 {
		span.Downgrade(measurement.Dead)
		span.Hint("Received no response.")
	} else if stats.PacketLoss > 0 {
		if m.ICMPLossThreshold == nil || stats.PacketLoss > float64(*m.ICMPLossThreshold) {
			span.Downgrade(measurement.Warn)
			span.Hint("Exceeded packet loss threshold.")
		}
	}

	return span
}
