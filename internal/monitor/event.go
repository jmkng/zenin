package monitor

import (
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
)

// NewEventMonitor returns a new `EventMonitor`.
func NewEventMonitor(m Monitor) EventMonitor {
	return EventMonitor{
		Id:            m.Id,
		Name:          m.Name,
		Kind:          m.Kind,
		Active:        m.Active,
		Interval:      m.Interval,
		Timeout:       m.Timeout,
		Description:   m.Description,
		RemoteAddress: m.RemoteAddress,
		RemotePort:    m.RemotePort,
		PluginFields:  m.PluginFields,
		HTTPFields:    m.HTTPFields,
		ICMPFields:    m.ICMPFields,
	}
}

// EventMonitor is a `Monitor` safe for use in plugin argument templates.
type EventMonitor struct {
	Id            *int
	Name          string
	Kind          measurement.ProbeKind
	Active        bool
	Interval      int
	Timeout       int
	Description   *string
	RemoteAddress *string
	RemotePort    *int16

	PluginFields
	HTTPFields
	ICMPFields
}

// NewEventMeasurement returns a new `EventMeasurement`.
func NewEventMeasurement(m measurement.Measurement) EventMeasurement {
	certificates := []EventCertificate{}
	for _, v := range m.Certificates {
		certificates = append(certificates, NewEventCertificate(v))
	}

	return EventMeasurement{
		Id:           m.Id,
		Duration:     m.Duration,
		State:        m.State,
		StateHint:    m.StateHint,
		Kind:         m.Kind,
		Certificates: certificates,
		HTTPFields:   m.HTTPFields,
		ICMPFields:   m.ICMPFields,
		PluginFields: m.PluginFields,
	}
}

// EventMeasurement is a `Measurement` safe for use in plugin argument templates.
type EventMeasurement struct {
	Id           *int
	Duration     float64
	State        measurement.ProbeState
	StateHint    []string
	Kind         measurement.ProbeKind
	Certificates []EventCertificate

	measurement.HTTPFields
	measurement.ICMPFields
	measurement.PluginFields
}

// NewEventCertificate returns a new `EventCertificate`.
func NewEventCertificate(c measurement.Certificate) EventCertificate {
	return EventCertificate{
		Id:                 c.Id,
		Version:            c.Version,
		SerialNumber:       c.SerialNumber,
		PublicKeyAlgorithm: c.PublicKeyAlgorithm,
		IssuerCommonName:   c.IssuerCommonName,
		SubjectCommonName:  c.SubjectCommonName,
		NotBefore:          c.NotBefore,
		NotAfter:           c.NotAfter,
	}
}

// EventCertificate is a `Certificate` safe for use in plugin argument templates.
type EventCertificate struct {
	Id                 *int
	Version            int
	SerialNumber       string
	PublicKeyAlgorithm string
	IssuerCommonName   string
	SubjectCommonName  string
	NotBefore          internal.TimeValue
	NotAfter           internal.TimeValue
}

type EventThreshold string

const (
	Warn EventThreshold = "WARN"
	Dead EventThreshold = "DEAD"
)

// Event is a plugin that can be executed based on a measurement state.
type Event struct {
	Id        *int            `json:"-" db:"event_id"`
	MonitorId *int            `json:"-" db:"event_monitor_id"`
	Threshold *EventThreshold `json:"threshold" db:"threshold"`

	PluginFields
}

// IsEligible will return true if the `Event` should run based on the provided `ProbeState`.
//
// A null threshold will always run. A warn threshold runs for warn and dead states,
// and a dead threshold runs only for dead states.
func (e Event) IsEligible(s measurement.ProbeState) bool {
	if e.Threshold == nil {
		return true
	}

	if *e.Threshold == Warn && s != measurement.Ok || *e.Threshold == Dead && s == measurement.Dead {
		return true
	}
	return false
}
