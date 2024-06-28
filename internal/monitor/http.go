package monitor

import "github.com/jmkng/zenin/internal/measurement"

type HTTPRange = string

const (
	Informational HTTPRange = "100-199"
	Successful    HTTPRange = "200-299"
	Redirection   HTTPRange = "300-399"
	ClientError   HTTPRange = "400-499"
	ServerError   HTTPRange = "500-599"
)

// NewHTTPProbe returns a new `HTTPProbe`
func NewHTTPProbe() HTTPProbe {
	return HTTPProbe{}
}

type HTTPProbe struct {
}

// Poll implements `Probe.Poll` for `HTTPProbe`.
func (h HTTPProbe) Poll(monitor Monitor) measurement.Span {
	return measurement.Span{}
}
