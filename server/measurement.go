package server

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal"
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
	return router
}
func (m MeasurementProvider) HandleGetCertificates(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	param := chi.URLParam(r, "id")
	parsed, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(internal.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	certificates, err := m.Service.Repository.GetCertificates(r.Context(), parsed)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(certificates, http.StatusOK)
}
