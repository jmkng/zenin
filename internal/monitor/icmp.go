package monitor

import (
	"github.com/jmkng/zenin/internal/measurement"
	_ "github.com/prometheus-community/pro-bing"
)

// NewICMPProbe returns a new `ICMPProbe`
func NewICMPProbe() ICMPProbe {
	return ICMPProbe{}
}

type ICMPProbe struct{}

// Poll implements `Probe.Poll` for `ICMPProbe`.
func (i ICMPProbe) Poll(monitor Monitor) measurement.Span {
	panic("todo")
}
