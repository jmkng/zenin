package monitor

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"text/template"
	"time"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
)

// TODO
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

// TODO
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

// TODO
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

// TODO
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

// TODO
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

// TODO
type EventCertificate struct {
	Id                 *int
	Version            int
	SerialNumber       string
	PublicKeyAlgorithm string
	IssuerCommonName   string
	SubjectCommonName  string
	NotBefore          time.Time
	NotAfter           time.Time
}

// EventStore is a container for event argument template data.
type EventStore struct {
	Monitor     EventMonitor
	Measurement EventMeasurement
}

type EventThreshold string

const (
	Warn EventThreshold = "WARN"
	Dead EventThreshold = "DEAD"
)

type Event struct {
	Id        *int            `json:"-" db:"event_id"`
	CreatedAt time.Time       `json:"-" db:"created_at"`
	UpdatedAt time.Time       `json:"-" db:"updated_at"`
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

// Start will execute the plugin specified by the `Event`.
//
// Returns the combined standard output and standard error of the plugin,
// or an error.
func (e Event) Start(ctx context.Context, m Monitor, me measurement.Measurement) ([]byte, error) {
	// Identify plugin.
	path := filepath.Join(env.Runtime.PluginsDir, *e.PluginName)
	_, err := os.Stat(path)
	if err != nil {
		return []byte{}, errors.New("plugin not found")
	}

	// Render plugin arguments.
	store := EventStore{
		Monitor:     NewEventMonitor(m),
		Measurement: NewEventMeasurement(me),
	}
	var args []string
	if e.PluginArgs != nil {
		for i, v := range *e.PluginArgs {
			name := fmt.Sprintf("%d-%d", *m.Id, i)
			t, err := template.New(name).Parse(v)
			if err != nil {
				return []byte{}, err
			}

			var result bytes.Buffer

			err = t.Execute(&result, store)
			if err != nil {
				return []byte{}, err
			}

			args = append(args, result.String())
		}
	}

	cmd := exec.CommandContext(ctx, path, args...)
	ext := filepath.Ext(*e.PluginName)
	switch runtime.GOOS {
	case "windows":
		switch ext {
		case ".ps1":
			args = append([]string{"-File", path}, args...)
			cmd = exec.Command("powershell", args...)
		case ".bat":
			args = append([]string{"/c", path}, args...)
			cmd = exec.Command("cmd", args...)
		}
	case "darwin", "linux":
		switch ext {
		case ".sh":
			shell, exists := os.LookupEnv("SHELL")
			if !exists {
				return []byte{}, errors.New("shell environment variable is not accessible")
			}
			args := append([]string{path}, args...)
			cmd = exec.Command(shell, args...)
		}
	}

	// Start plugin. Collect combined output.
	output, err := cmd.CombinedOutput()
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return output, errors.New("timeout")
		} else if exit, ok := err.(*exec.ExitError); ok {
			return output, fmt.Errorf("exited with code %v", exit)
		}
		return output, errors.New("failed to start")
	}

	return output, nil
}
