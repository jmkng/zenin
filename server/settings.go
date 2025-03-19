package server

import (
	"errors"
	"net/http"
	"os"

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
		router.Get("/themes", a.HandleGetThemes)
		router.Get("/themes/active", a.HandleGetActiveTheme)
		router.Post("/", a.HandleUpdateSettings)
	})
	//////////////////

	return router
}

func (a SettingsProvider) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	s, err := a.Service.GetSettings(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(struct {
		Settings settings.Settings `json:"settings"`
	}{Settings: s}, http.StatusOK)
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

	err = a.Service.UpdateSettings(r.Context(), incoming)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.As(err, &env.Validation{}) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	responder.Status(http.StatusOK)
}

func (a SettingsProvider) HandleGetActiveTheme(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	theme, err := a.Service.GetActiveTheme(r.Context())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			responder.Status(http.StatusUnprocessableEntity)
			return
		}
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.CSS(theme, http.StatusOK)
}

func (a SettingsProvider) HandleGetThemes(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	themes, err := a.Service.GetThemes()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	// TODO: Check serialization.
	var t []string = nil
	if len(themes) != 0 {
		t = themes
	}

	responder.Data(struct {
		Themes []string `json:"themes"`
	}{Themes: t}, http.StatusOK)
}
