package monitor

import (
	"context"
	"errors"
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
func (i ICMPProbe) Poll(m Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)

	client := icmp.New(*m.RemoteAddress)
	err := client.Resolve()
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	// ICMP/UDP
	if *m.ICMPProtocol == ICMP {
		client.SetPrivileged(true)
	}

	client.Size = *m.ICMPSize
	client.Interval = time.Millisecond * time.Duration(*m.ICMPWait)
	client.Count = *m.ICMPCount
	client.TTL = *m.ICMPTTL

	deadline, cancel := m.Deadline(context.Background())
	defer cancel()

	err = client.RunWithContext(deadline)
	if err != nil {
		span.Downgrade(measurement.Dead)
		if errors.Is(err, context.DeadlineExceeded) {
			span.Hint(TimeoutMessage)
		} else if *m.ICMPProtocol == ICMP {
			span.Hint("Ensure Zenin has root privilege.")
		}
		return span
	}

	stats := client.Statistics()
	out := stats.PacketsSent
	in := stats.PacketsRecv
	min := stats.MinRtt.Seconds() * 1000
	avg := stats.AvgRtt.Seconds() * 1000
	max := stats.MaxRtt.Seconds() * 1000
	span.ICMPPacketsOut = &out
	span.ICMPPacketsIn = &in
	span.ICMPMinRTT = &min
	span.ICMPAvgRTT = &avg
	span.ICMPMaxRTT = &max

	if stats.PacketLoss > 0 {
		// TODO: Allow setting packet loss threshold?
		span.Downgrade(measurement.Dead, "Packet loss was detected.")
		return span
	}

	return span
}
