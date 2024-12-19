package monitor

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
)

const (
	RemoteAddressInvalidMessage string = "Remote address may be invalid."
	TimeoutMessage              string = "The monitor timed out."
)

type HTTPRange = string

const (
	Informational HTTPRange = "100-199"
	Successful    HTTPRange = "200-299"
	Redirection   HTTPRange = "300-399"
	ClientError   HTTPRange = "400-499"
	ServerError   HTTPRange = "500-599"
)

type HTTPMethod = string

const (
	Get    HTTPMethod = "GET"
	Head   HTTPMethod = "HEAD"
	Post   HTTPMethod = "POST"
	Put    HTTPMethod = "PUT"
	Patch  HTTPMethod = "PATCH"
	Delete HTTPMethod = "GET"
)

// Probe is a type used to build a `Span` describing the state of a resource.
type Probe interface {
	// Poll will execute an action that returns a `Span` describing the result.
	//
	// No error is returned because this should be an infallible operation,
	// meaning any errors are captured as hints on a span.
	//
	// This way, we can ensure some kind of span always comes out of this operation,
	// and trigger events normally.
	Poll(ctx context.Context, m Monitor) measurement.Span
}

type ProtocolKind string

const (
	ICMP ProtocolKind = "ICMP"
	UDP  ProtocolKind = "UDP"
)

// Monitor is the monitor domain type.
type Monitor struct {
	Id            *int                      `json:"id" db:"monitor_id"`
	CreatedAt     time.Time                 `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time                 `json:"updatedAt" db:"updated_at"`
	Name          string                    `json:"name" db:"name"`
	Kind          measurement.ProbeKind     `json:"kind" db:"monitor_kind"`
	Active        bool                      `json:"active" db:"active"`
	Interval      int                       `json:"interval" db:"interval"`
	Timeout       int                       `json:"timeout" db:"timeout"`
	Description   *string                   `json:"description" db:"description"`
	RemoteAddress *string                   `json:"remoteAddress" db:"remote_address"`
	RemotePort    *int16                    `json:"remotePort" db:"remote_port"`
	Measurements  []measurement.Measurement `json:"measurements"`
	Events        []Event                   `json:"events"`

	PluginFields
	HTTPFields
	ICMPFields
}

type PluginFields struct {
	PluginName *string              `json:"pluginName" db:"plugin_name"`
	PluginArgs *internal.ArrayValue `json:"pluginArgs" db:"plugin_args"`
}

type HTTPFields struct {
	HTTPRange  *HTTPRange `json:"httpRange" db:"http_range"`
	HTTPMethod *string    `json:"httpMethod" db:"http_method"`
	// HTTPRequestHeaders is a list of key/value pairs representing headers to send with the request.
	//
	// At the time of request, values for duplicate keys are combined by net/http.
	//
	// https://pkg.go.dev/net/http#Header.Add
	HTTPRequestHeaders *internal.PairListValue `json:"httpRequestHeaders" db:"http_request_headers"`
	HTTPRequestBody    *string                 `json:"httpRequestBody" db:"http_request_body"`
	HTTPExpiredCertMod *string                 `json:"httpExpiredCertMod" db:"http_expired_cert_mod"`
	HTTPCaptureHeaders *bool                   `json:"httpCaptureHeaders" db:"http_capture_headers"`
	HTTPCaptureBody    *bool                   `json:"httpCaptureBody" db:"http_capture_body"`
}

type ICMPFields struct {
	ICMPSize          *int          `json:"icmpSize" db:"icmp_size"`
	ICMPWait          *int          `json:"icmpWait" db:"icmp_wait"`
	ICMPCount         *int          `json:"icmpCount" db:"icmp_count"`
	ICMPTTL           *int          `json:"icmpTtl" db:"icmp_ttl"`
	ICMPProtocol      *ProtocolKind `json:"icmpProtocol" db:"icmp_protocol"`
	ICMPLossThreshold *int          `json:"icmpLossThreshold" db:"icmp_loss_threshold"`
}

// Deadline returns a copy of the parent context with a timeout set according to
// the monitor `Timeout` field.
func (m Monitor) Deadline(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, time.Duration(m.Timeout)*time.Second)
}

// Poll will invoke a `Probe`, returning a `Measurement` describing the result.
//
// This function should only ever be called on a `Monitor` from the database,
// it requires essential fields (including id) to be populated, or it will panic.
//
// If the `Monitor` has events, the events will all be started in their own threads,
// and the function will immediately return after that.
func (m Monitor) Poll() measurement.Measurement {
	env.Debug("poll starting", "monitor(id)", *m.Id)

	var result measurement.Measurement
	result.MonitorId = m.Id

	var probe Probe
	switch m.Kind {
	case measurement.ICMP:
		probe = NewICMPProbe()
	case measurement.HTTP:
		probe = NewHTTPProbe()
	case measurement.TCP:
		probe = NewTCPProbe()
	case measurement.Plugin:
		probe = NewPluginProbe()
	default:
		panic("unrecognized probe")
	}

	deadline, cancel := m.Deadline(context.Background())
	defer cancel()

	// Start timer.
	start := time.Now()

	// Poll.
	span := probe.Poll(deadline, m)
	span.Kind = m.Kind

	// End timer.
	duration := float64(time.Since(start)) / float64(time.Millisecond)

	result.Span = span
	result.CreatedAt = start
	result.UpdatedAt = start
	result.Duration = duration

	env.Debug("poll stopping", "monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration),
		"state", result.State, "hints", result.StateHint, "events", len(m.Events))

	// Start events.
	for _, v := range m.Events {
		if v.IsEligible(span.State) {
			env.Debug("event starting", "monitor(id)", m.Id, "event(plugin)", v.PluginName, "event(id)", v.Id)

			go func() {
				// Reset deadline.
				deadline, cancel := m.Deadline(context.Background())
				defer cancel()

				output, err := v.Start(deadline)
				if err != nil {
					env.Error("event failed", "monitor(id)", m.Id, "event(plugin)", v.PluginName, "event(id)", v.Id, "error", err, "output", output)
				} else {
					env.Debug("event stopping", "monitor(id)", m.Id, "event(plugin)", v.PluginName, "event(id)", v.Id, "output", string(output))
				}
			}()
		}
	}

	return result
}

// Validate will return an error if the `Monitor` is in an invalid state.
func (m Monitor) Validate() error {
	errors := []string{}

	require := func(value string) {
		message := fmt.Sprintf("value for field `%v` is required", value)
		errors = append(errors, message)
	}

	// Monitor
	if m.Interval == 0 {
		require("interval")
	}
	if m.Timeout == 0 {
		require("timeout")
	}
	if m.Name == "" {
		require("name")
	}

	kind, err := measurement.ProbeKindFromString(string(m.Kind))
	if err != nil {
		require("kind")
	}
	switch kind {
	case measurement.HTTP:
		if m.RemoteAddress == nil {
			require("remoteAddress")
		}
		if m.HTTPRange == nil {
			require("httpRange")
		}
	case measurement.TCP, measurement.ICMP:
		if m.RemoteAddress == nil {
			require("remoteAddress")
		}
	case measurement.Plugin:
		if m.PluginName == nil {
			require("pluginName")
		}
	}

	// Events
	name := false
	args := false
	for _, v := range m.Events {
		if !name {
			if v.PluginName == nil || strings.TrimSpace(*v.PluginName) == "" {
				errors = append(errors, "event must have a plugin name")
				name = true
			}
		}
		if !args {
			if v.PluginArgs != nil {
				for _, v := range *v.PluginArgs {
					if strings.TrimSpace(v) == "" {
						errors = append(errors, "event arguments must not be empty")
						args = true
					}
				}
			}
		}

		if name && args {
			break
		}
	}

	if len(errors) > 0 {
		return env.NewValidation(errors...)
	}
	return nil
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
func (e Event) Start(ctx context.Context) ([]byte, error) {
	command := *e.PluginName

	path := filepath.Join(env.Runtime.PluginsDir, command)
	_, err := os.Stat(path)
	if err != nil {
		return []byte{}, errors.New("plugin not found")
	}

	var args []string
	if e.PluginArgs != nil {
		args = append(args, *e.PluginArgs...)
	}

	// Most of this function should behave the same as the plugin probe,
	// but instead of downgrading a span, just return an error.

	cmd := exec.CommandContext(ctx, path, args...)
	ext := filepath.Ext(command)

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
