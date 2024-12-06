package server

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
)

func NewMeasurementHandler(service measurement.MeasurementService) MeasurementHandler {
	provider := NewMeasurementProvider(service)
	return MeasurementHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
}

type MeasurementHandler struct {
	Provider MeasurementProvider
	mux      http.Handler
}

func (h MeasurementHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mux.ServeHTTP(w, r)
}

func NewMeasurementProvider(service measurement.MeasurementService) MeasurementProvider {
	return MeasurementProvider{
		Service: service,
	}
}

type MeasurementProvider struct {
	Service measurement.MeasurementService
}

func (m MeasurementProvider) Mux() http.Handler {
	router := chi.NewRouter()
	router.Get("/{id}/certificates", m.HandleGetCertificates)
	router.Delete("/", m.HandleDeleteMeasurements)
	return router
}

func (m MeasurementProvider) HandleGetCertificates(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	param := chi.URLParam(r, "id")
	parsed, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(env.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	certificates, err := m.Service.Repository.SelectCertificate(r.Context(), parsed)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(certificates, http.StatusOK)
}

func (m MeasurementProvider) HandleDeleteMeasurements(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	id := scanQueryParameterIds(r.URL.Query())
	if len(id) == 0 {
		responder.Error(env.NewValidation("Expected `id` query parameter."),
			http.StatusBadRequest)
		return
	}

	err := m.Service.Repository.DeleteMeasurement(r.Context(), id)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Status(http.StatusOK)
}
