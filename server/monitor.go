package server

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

func NewMonitorHandler(service monitor.MonitorService) MonitorHandler {
	provider := NewMonitorProvider(service)
	return MonitorHandler{Provider: provider, mux: provider.Mux()}
}

type MonitorHandler struct {
	Provider MonitorProvider
	mux      http.Handler
}

func (h MonitorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mux.ServeHTTP(w, r)
}

func NewMonitorProvider(service monitor.MonitorService) MonitorProvider {
	return MonitorProvider{
		Service: service,
	}
}

type MonitorProvider struct {
	Service monitor.MonitorService
}

func (m MonitorProvider) Mux() http.Handler {
	router := chi.NewRouter()
	router.Get("/", m.HandleGetMonitors)
	router.Post("/", m.HandleCreateMonitor)
	router.Delete("/", m.HandleDeleteMonitor)
	router.Patch("/", m.HandleToggleMonitor)
	router.Put("/{id}", m.HandleUpdateMonitor)
	router.Get("/{id}/measurements", m.HandleGetMeasurements)
	router.Get("/{id}/poll", m.HandlePollMonitor)
	router.Get("/plugins", m.HandleGetPlugins)
	return router
}

func (m MonitorProvider) HandleGetMonitors(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	query := r.URL.Query()
	params := newSelectMonitorParamsFromQuery(query)

	measurements := 0
	if m, err := strconv.Atoi(query.Get("measurements")); err == nil {
		measurements = m
	}
	monitors, err :=
		m.Service.Repository.SelectMonitor(r.Context(), measurements, &params)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if monitors == nil {
		monitors = make([]monitor.Monitor, 0)
	}
	for i := range monitors {
		if monitors[i].Measurements == nil {
			monitors[i].Measurements = make([]measurement.Measurement, 0)
		}
		if monitors[i].Events == nil {
			monitors[i].Events = make([]monitor.Event, 0)
		}
	}

	includePlugins, _ := strconv.ParseBool(r.URL.Query().Get("plugins"))
	if includePlugins {
		plugins, err := m.Service.GetPlugins()
		if err != nil {
			responder.Error(err, http.StatusInternalServerError)
			return
		}
		if plugins == nil {
			plugins = make([]string, 0)
		}
		responder.Data(struct {
			Monitors []monitor.Monitor `json:"monitors"`
			Plugins  []string          `json:"plugins"`
		}{Monitors: monitors, Plugins: plugins}, http.StatusOK)
		return
	}

	responder.Data(struct {
		Monitors []monitor.Monitor `json:"monitors"`
	}{Monitors: monitors}, http.StatusOK)
}

func (m MonitorProvider) HandleCreateMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	var incoming monitor.Monitor
	err := Decoder(r.Body).Decode(&incoming)
	if err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	id, time, err := m.Service.CreateMonitor(r.Context(), incoming)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.As(err, &env.Validation{}) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	responder.Data(internal.CreatedTimestampValue{
		Id:             id,
		TimestampValue: time,
	}, http.StatusCreated)
}

func (m MonitorProvider) HandleDeleteMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	params := newSelectMonitorParamsFromQuery(r.URL.Query())
	if len(*params.Id) == 0 {
		responder.Error(env.NewValidation(`Missing "id" query parameter.`),
			http.StatusBadRequest)
		return
	}

	err := m.Service.Repository.DeleteMonitor(r.Context(), *params.Id)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	for _, v := range *params.Id {
		m.Service.Distributor <- monitor.StopMessage{Id: v}
	}

	responder.Status(http.StatusOK)
}

func (m MonitorProvider) HandleToggleMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	params := newSelectMonitorParamsFromQuery(r.URL.Query())
	if err := params.Validate(); err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	// Make sure `Kind` doesn't interfere with below query.
	params.Kind = nil
	time := internal.NewTimeValue(time.Now())

	m.Service.Repository.ToggleMonitor(r.Context(), *params.Id, *params.Active, time)
	if *params.Active {
		monitors, err := m.Service.Repository.SelectMonitor(r.Context(), 0, &params)
		if err != nil {
			responder.Error(err, http.StatusInternalServerError)
			return
		}
		for _, v := range monitors {
			m.Service.Distributor <- monitor.StartMessage{Monitor: v}
		}
	} else {
		for _, v := range *params.Id {
			m.Service.Distributor <- monitor.StopMessage{Id: v}
		}
	}

	responder.Data(internal.TimestampValue{Time: time}, http.StatusOK)
}

func (m MonitorProvider) HandleUpdateMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	param := chi.URLParam(r, "id")
	id, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(env.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	found, err := m.Service.Repository.SelectMonitor(r.Context(),
		0, &monitor.SelectMonitorParams{Id: &[]int{id}})
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if len(found) == 0 {
		message := fmt.Sprintf(`Monitor with id "%d" does not exist.`, id)
		responder.Error(env.NewValidation(message), http.StatusBadRequest)
		return
	}

	var incoming monitor.Monitor
	err = Decoder(r.Body).Decode(&incoming)
	if err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	time, err := m.Service.UpdateMonitor(r.Context(), incoming)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.As(err, &env.Validation{}) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	responder.Data(time, http.StatusOK)
}

func (m MonitorProvider) HandleGetMeasurements(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	param := chi.URLParam(r, "id")
	id, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(env.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	params := newSelectMeasurementParamsFromQuery(r.URL.Query())
	measurements, err := m.Service.Repository.SelectMeasurement(r.Context(), id, &params)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if measurements == nil {
		measurements = make([]measurement.Measurement, 0)
	}

	responder.Data(struct {
		Measurements []measurement.Measurement `json:"measurements"`
	}{Measurements: measurements}, http.StatusOK)
}

func (m MonitorProvider) HandlePollMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	param := chi.URLParam(r, "id")
	id, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(env.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	found, err := m.Service.Repository.SelectMonitor(r.Context(),
		0, &monitor.SelectMonitorParams{Id: &[]int{id}})
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if len(found) == 0 {
		message := fmt.Sprintf(`Monitor with id "%d" does not exist.`, id)
		responder.Error(env.NewValidation(message), http.StatusBadRequest)
		return
	}

	m.Service.Distributor <- monitor.PollMessage{Monitor: found[0]}

	responder.Status(http.StatusAccepted)
}

func (m MonitorProvider) HandleGetPlugins(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	plugins, err := m.Service.GetPlugins()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if plugins == nil {
		plugins = make([]string, 0)
	}

	responder.Data(struct {
		Plugins []string `json:"plugins"`
	}{Plugins: plugins}, http.StatusOK)

}

// newSelectMonitorParamsFromQuery returns a `SelectMonitorParams` by parsing the values from
// a `net/http` query string.
func newSelectMonitorParamsFromQuery(values url.Values) monitor.SelectMonitorParams {
	// TODO: Limit use of this in handlers that don't want the extra information,
	// use something like scanQueryParameterIds directly instead.
	var id *[]int
	if x := scanQueryParameterIds(values); len(x) > 0 {
		id = &x
	}
	var active *bool
	var kind *measurement.ProbeKind

	if vactive, err := strconv.ParseBool(values.Get("active")); err == nil {
		active = &vactive
	}
	if vkind, err := measurement.ProbeKindFromString(values.Get("kind")); err == nil {
		kind = &vkind
	}

	return monitor.SelectMonitorParams{
		Id:     id,
		Active: active,
		Kind:   kind,
	}
}

// newSelectMeasurementParamsFromQuery returns a `SelectMonitorParams` by parsing the values from
// a `net/http` query string.
func newSelectMeasurementParamsFromQuery(values url.Values) monitor.SelectMeasurementParams {
	params := monitor.SelectMeasurementParams{
		After:  nil,
		Before: nil,
	}

	format := "1/2/2006"
	if braw := values.Get("before"); braw != "" {
		if bparsed, err := time.Parse(format, braw); err == nil {
			before := internal.NewTimeValue(bparsed)
			params.Before = &before
		}
	}
	if araw := values.Get("after"); araw != "" {
		if aparsed, err := time.Parse(format, araw); err == nil {
			after := internal.NewTimeValue(aparsed)
			params.After = &after
		}
	}

	return params
}
