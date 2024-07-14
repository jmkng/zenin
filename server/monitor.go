package server

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
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

	router.Put("/{id}", m.HandleReplaceMonitor)
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
	fmt.Fprintf(w, "create monitor")
}

func (m MonitorProvider) HandleDeleteMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "delete monitor")
}

func (m MonitorProvider) HandleToggleMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "toggle monitor")
}

func (m MonitorProvider) HandleReplaceMonitor(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	fmt.Fprintf(w, "replace monitor: id=%v", id)
}

func (m MonitorProvider) HandlePollMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "poll monitor")
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
	var kind *monitor.ProbeKind

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
	if vkind, err := monitor.ProbeKindFromString(values.Get("kind")); err == nil {
		kind = &vkind
	}

	return monitor.SelectParams{
		Id:     id,
		Active: active,
		Kind:   kind,
	}
}
