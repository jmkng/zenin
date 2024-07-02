package monitor

import "github.com/jmkng/zenin/internal/measurement"

// NewICMPProbe returns a new `ICMPProbe`
func NewICMPProbe(ping bool) ICMPProbe {
	return ICMPProbe{}
}

type ICMPProbe struct {
	ping bool
}

// Poll implements `Probe.Poll` for `ICMPProbe`.
func (i ICMPProbe) Poll(monitor Monitor) (measurement.Measurement, error) {
	panic("todo")
}
