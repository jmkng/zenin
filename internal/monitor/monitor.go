package monitor

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/settings"
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
	Id            *int                  `json:"id" db:"monitor_id"`
	CreatedAt     internal.TimeValue    `json:"createdAt" db:"created_at"`
	UpdatedAt     internal.TimeValue    `json:"updatedAt" db:"updated_at"`
	Name          string                `json:"name" db:"name"`
	Kind          measurement.ProbeKind `json:"kind" db:"monitor_kind"`
	Active        bool                  `json:"active" db:"active"`
	Interval      int                   `json:"interval" db:"interval"`
	Timeout       int                   `json:"timeout" db:"timeout"`
	Description   *string               `json:"description" db:"description"`
	RemoteAddress *string               `json:"remoteAddress" db:"remote_address"`
	RemotePort    *int16                `json:"remotePort" db:"remote_port"`

	Measurements []measurement.Measurement `json:"measurements"`
	Events       []Event                   `json:"events"`

	PluginFields
	HTTPFields
	ICMPFields
}

type PluginFields struct {
	PluginName *string             `json:"pluginName" db:"plugin_name"`
	PluginArgs internal.ArrayValue `json:"pluginArgs" db:"plugin_args"`
}

type HTTPFields struct {
	HTTPRange  *HTTPRange `json:"httpRange" db:"http_range"`
	HTTPMethod *string    `json:"httpMethod" db:"http_method"`
	// HTTPRequestHeaders is a list of key/value pairs representing headers to send with the request.
	//
	// At the time of request, values for duplicate keys are combined by net/http.
	//
	// https://pkg.go.dev/net/http#Header.Add
	HTTPRequestHeaders internal.PairListValue `json:"httpRequestHeaders" db:"http_request_headers"`
	HTTPRequestBody    *string                `json:"httpRequestBody" db:"http_request_body"`
	HTTPExpiredCertMod *string                `json:"httpExpiredCertMod" db:"http_expired_cert_mod"`
	HTTPCaptureHeaders *bool                  `json:"httpCaptureHeaders" db:"http_capture_headers"`
	HTTPCaptureBody    *bool                  `json:"httpCaptureBody" db:"http_capture_body"`
}

type ICMPFields struct {
	ICMPSize          *int          `json:"icmpSize" db:"icmp_size"`
	ICMPWait          *int          `json:"icmpWait" db:"icmp_wait"`
	ICMPCount         *int          `json:"icmpCount" db:"icmp_count"`
	ICMPTTL           *int          `json:"icmpTtl" db:"icmp_ttl"`
	ICMPProtocol      *ProtocolKind `json:"icmpProtocol" db:"icmp_protocol"`
	ICMPLossThreshold *int          `json:"icmpLossThreshold" db:"icmp_loss_threshold"`
}

// Context returns a copy of the parent context with a timeout set according to the monitor `Timeout` field.
func (m Monitor) Context(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, time.Duration(m.Timeout)*time.Second)
}

// Poll will invoke a `Probe`, returning a `Measurement` describing the result.
//
// This function should only ever be called on a `Monitor` from the database,
// it requires essential fields (including id) to be populated, or it will panic.
//
// If the `Monitor` has events, the events will all be started in their own threads,
// and the function will immediately return after that.
func (m Monitor) Poll(s settings.Settings) measurement.Measurement {
	env.Debug("poll starting", "monitor(id)", *m.Id)

	var e measurement.Measurement
	e.MonitorId = m.Id

	var probe Probe
	switch m.Kind {
	case measurement.ICMP:
		probe = NewICMPProbe()
	case measurement.HTTP:
		probe = NewHTTPProbe()
	case measurement.TCP:
		probe = NewTCPProbe()
	case measurement.Plugin:
		probe = NewPluginProbe(s)
	default:
		panic("unrecognized probe")
	}

	ctx, cancel := m.Context(context.Background())
	defer cancel()

	start := time.Now()
	span := probe.Poll(ctx, m)
	span.Kind = m.Kind
	duration := float64(time.Since(start)) / float64(time.Millisecond)

	e.Span = span
	e.CreatedAt = internal.NewTimeValue(start)
	e.UpdatedAt = internal.NewTimeValue(start)
	e.Duration = duration

	env.Debug("poll stopping", "monitor(id)", *m.Id, "duration(ms)", fmt.Sprintf("%.2f", duration),
		"state", e.State, "hints", e.StateHint, "events", len(m.Events))

	executor := PluginExecutor{
		Settings: s,
		Data: struct {
			Monitor     EventMonitor
			Measurement EventMeasurement
		}{Monitor: NewEventMonitor(m), Measurement: NewEventMeasurement(e)},
	}

	// Start events.
	for _, v := range m.Events {
		if !v.IsEligible(span.State) {
			continue
		}

		env.Debug("event starting", "monitor(id)", *m.Id, "event(id)", *v.Id, "plugin", *v.PluginName, "arguments", v.PluginArgs)
		go func() {
			ctx, cancel := m.Context(context.Background())
			defer cancel()

			code, stdout, stderr, dx := executor.Run(ctx, v.PluginFields)
			hints := append(dx.Warnings, dx.Errors...)
			env.Debug("event stopping", "monitor(id)", *m.Id, "hints", hints, "code", code, "stdout", stdout, "stderr", stderr)
		}()
	}

	return e
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
			for _, v := range v.PluginArgs {
				if strings.TrimSpace(v) == "" {
					errors = append(errors, "event arguments must not be empty")
					args = true
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

// MeasurementMessage is used to distribute a `Measurement` to the
// repository and feed subscribers.
type MeasurementMessage struct {
	Measurement measurement.Measurement
}

// SubscribeMessage is used to add a new feed subscriber.
type SubscribeMessage struct {
	Subscriber *websocket.Conn
}

// UnsubscribeMessage is used to remove an existing feed subscriber,
// and close the connection.
type UnsubscribeMessage struct {
	Id int
}

// StartMessage is used to begin polling a `Monitor`
type StartMessage struct {
	Monitor Monitor
}

// StopMessage is used to stop polling an active `Monitor`
type StopMessage struct {
	Id int
}

// PollMessage is used to manually trigger a poll action.
type PollMessage struct {
	Monitor Monitor
}
