package monitor

import "github.com/jmkng/zenin/internal/measurement"

// NewScriptProbe returns a new `ScriptProbe`
func NewScriptProbe() ScriptProbe {
	return ScriptProbe{}
}

type ScriptProbe struct{}

// Poll implements `Probe.Poll` for `ScriptProbe`.
func (s ScriptProbe) Poll(monitor Monitor) measurement.Span {
	panic("todo")
}
