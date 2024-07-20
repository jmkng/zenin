package monitor

import (
	"github.com/jmkng/zenin/internal/measurement"
)

// NewPluginProbe returns a new `PluginProbe`
func NewPluginProbe() PluginProbe {
	return PluginProbe{}
}

type PluginProbe struct{}

// Poll implements `Probe.Poll` for `PluginProbe`.
func (s PluginProbe) Poll(monitor Monitor) measurement.Span {
	panic("todo")
}
