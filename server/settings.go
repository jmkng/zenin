package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/settings"
)

func NewSettingsHandler(service settings.SettingsService) SettingsHandler {
	provider := NewSettingsProvider(service)
	return SettingsHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
}

type SettingsHandler struct {
	Provider SettingsProvider
	mux      http.Handler
}

func (a SettingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	a.mux.ServeHTTP(w, r)
}

func NewSettingsProvider(service settings.SettingsService) SettingsProvider {
	return SettingsProvider{
		Service: service,
	}
}

type SettingsProvider struct {
	Service settings.SettingsService
}

func (a SettingsProvider) Mux() http.Handler {
	router := chi.NewRouter()

	//// private /////
	router.Group(func(private chi.Router) {
		private.Use(Authenticate)
		router.Get("/", a.HandleGetSettings)
		router.Post("/", a.HandleUpdateSettings)
	})
	//////////////////

	return router
}

func (a SettingsProvider) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	settings, err := a.Service.GetSettings(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	responder.Data(settings, http.StatusOK)
}

func (a SettingsProvider) HandleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	var incoming settings.Settings
	err := StrictDecoder(r.Body).Decode(&incoming)
	if err != nil {
		responder.Error(env.
			NewValidation("Received unexpected data, only key `delimiters` is required."),
			http.StatusBadRequest)
		return
	}

	err = incoming.Validate()
	if err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	err = a.Service.UpdateSettings(r.Context(), incoming)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Status(http.StatusOK)
}
