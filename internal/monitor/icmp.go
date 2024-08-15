package monitor

import (
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
func (i ICMPProbe) Poll(monitor Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)

	client := icmp.New(*monitor.RemoteAddress)
	err := client.Resolve()
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	// TODO: Root is needed to sent true ICMP packets. This uses UDP right now.
	// Decide when to bind a raw socket.
	// Should this detect root somehow, or instead rely on an environment variable, or something else?

	client.Size = *monitor.ICMPSize
	client.Interval = time.Millisecond * time.Duration(*monitor.ICMPWait)
	client.Count = *monitor.ICMPCount
	client.TTL = *monitor.ICMPTTL

	timeout := time.Duration(monitor.Timeout) * time.Second
	done := make(chan error, 1)

	// TODO: Find better solution.
	// A context can be passed in with `RunWithContext`, but pro-bing doesn't seem to return a specific error for timeouts,
	// which makes adding a timeout hint difficult.
	// On second thought, maybe handle timeouts in the `Poll` method so no probe has to worry about it.
	go func(out chan<- error) {
		err = client.Run()
		out <- err
	}(done)

	select {
	case err := <-done:
		if err != nil {
			span.Downgrade(measurement.Dead)
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
	case <-time.After(timeout):
		span.Downgrade(measurement.Dead, TimeoutMessage)
		return span
	}
}
