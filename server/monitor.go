package server

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

func NewMonitorHandler(service monitor.MonitorService) MonitorHandler {
	provider := NewMonitorProvider(service)
	return MonitorHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
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
	router.Get("/{id}/poll", m.HandlePollMonitor)
	return router
}

func (m MonitorProvider) HandleGetMonitors(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	query := r.URL.Query()
	params := SelectParamsFromQuery(query)

	measurements := 0
	if m, err := strconv.Atoi(query.Get("measurements")); err == nil {
		measurements = m
	}
	monitors, err :=
		m.Service.Repository.SelectMonitor(r.Context(), &params, measurements)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	responder.Data(monitors, http.StatusOK)
}

func (m MonitorProvider) HandleCreateMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	var incoming monitor.Monitor
	err := StrictDecoder(r.Body).Decode(&incoming)
	if err != nil {
		responder.Error(internal.
			NewValidation("Received unexpected data, keys `id`, `name`, `kind`, `active`, `interval`, `timeout` are mandatory."),
			http.StatusBadRequest)
		return
	}
	if err := incoming.Validate(); err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}
	id, err := m.Service.Repository.InsertMonitor(r.Context(), incoming)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	responder.Data(id, http.StatusCreated)
}

func (m MonitorProvider) HandleDeleteMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	params := SelectParamsFromQuery(r.URL.Query())
	if len(*params.Id) == 0 {
		responder.Error(internal.NewValidation("Expected `id` query parameter."),
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
	params := SelectParamsFromQuery(r.URL.Query())

	validation := internal.NewValidation()
	if params.Id == nil || len(*params.Id) == 0 {
		validation.Push("Expected `id` query parameter.")
	}
	if params.Active == nil {
		validation.Push("Expected `active` query parameter.")
	}
	if !validation.Empty() {
		responder.Error(validation, http.StatusBadRequest)
		return
	}

	// Make sure `Kind` doesn't interfere with below query.
	params.Kind = nil

	m.Service.Repository.ToggleMonitor(r.Context(), *params.Id, *params.Active)

	if *params.Active {
		monitors, err := m.Service.Repository.SelectMonitor(r.Context(), &params, 0)
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

	responder.Status(http.StatusOK)
}

func (m MonitorProvider) HandleUpdateMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	param := chi.URLParam(r, "id")
	parsed, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(internal.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	found, err := m.Service.Repository.SelectMonitor(r.Context(),
		&monitor.SelectParams{Id: &[]int{parsed}},
		0)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if len(found) == 0 {
		message := fmt.Sprintf("Monitor with id `%v` does not exist.", param)
		responder.Error(internal.NewValidation(message), http.StatusBadRequest)
		return
	}

	var incoming monitor.Monitor
	err = StrictDecoder(r.Body).Decode(&incoming)
	if err != nil {
		responder.Error(internal.
			NewValidation("Received unexpected data, keys `id`, `name`, `kind`, `active`, `interval`, `timeout` are mandatory."),
			http.StatusBadRequest)
		return
	}

	err = incoming.Validate()
	if err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}
	err = m.Service.UpdateMonitor(r.Context(), incoming)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	responder.Status(http.StatusOK)
}

func (m MonitorProvider) HandlePollMonitor(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	param := chi.URLParam(r, "id")
	parsed, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(internal.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	found, err := m.Service.Repository.SelectMonitor(r.Context(),
		&monitor.SelectParams{Id: &[]int{parsed}},
		0)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if len(found) == 0 {
		message := fmt.Sprintf("monitor with id `%v` does not exist", param)
		responder.Error(internal.NewValidation(message), http.StatusBadRequest)
		return
	}

	m.Service.Distributor <- monitor.PollMessage{Monitor: found[0]}
	responder.Status(http.StatusAccepted)
}

// SelectParamsFromQuery returns a `SelectParams` by parsing the values from
// a query string.
//
// This function reads only the first set of each group, ignoring any others:
//
// ...?id=1,2,3&id=4,5 = [1, 2, 3]
func SelectParamsFromQuery(values url.Values) monitor.SelectParams {
	var id *[]int
	var active *bool
	var kind *measurement.ProbeKind

	if vid := values.Get("id"); vid != "" {
		pid := []int{}
		split := strings.Split(vid, ",")
		for _, v := range split {
			if num, err := strconv.Atoi(v); err == nil {
				pid = append(pid, num)
			}
		}
		if len(pid) > 0 {
			id = &pid
		}
	}
	if vactive, err := strconv.ParseBool(values.Get("active")); err == nil {
		active = &vactive
	}
	if vkind, err := measurement.ProbeKindFromString(values.Get("kind")); err == nil {
		kind = &vkind
	}

	return monitor.SelectParams{
		Id:     id,
		Active: active,
		Kind:   kind,
	}
}
