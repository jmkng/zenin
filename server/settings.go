package server

import (
	"errors"
	"net/http"
	"os"
	"strconv"

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
		private.Get("/", a.HandleGetSettings)
		private.Get("/themes", a.HandleGetThemes)
		private.Post("/", a.HandleUpdateSettings)
	})
	//////////////////
	router.Get("/themes/active", a.HandleGetActiveTheme)

	return router
}

func (a SettingsProvider) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	s, err := a.Service.GetSettings(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	includeThemes, _ := strconv.ParseBool(r.URL.Query().Get("themes"))
	if includeThemes {
		themes, err := a.Service.GetThemes()
		if err != nil {
			responder.Error(err, http.StatusInternalServerError)
			return
		}
		if themes == nil {
			themes = make([]string, 0)
		}
		responder.Data(struct {
			Settings settings.Settings `json:"settings"`
			Themes   []string          `json:"themes"`
		}{Settings: s, Themes: themes}, http.StatusOK)
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
		responder.Error(env.NewValidation("Received unexpected data, only key `delimiters` is required."),
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
	jsonResponse := r.Header.Get(Accept) == ContentTypeApplicationJson

	strict := true
	if s, err := strconv.ParseBool(r.URL.Query().Get("strict")); err == nil {
		strict = s
	}

	ctx := r.Context()
	theme, err := a.Service.GetActiveTheme(ctx)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			if strict || !jsonResponse {
				responder.Status(http.StatusNotFound)
				return
			}
		} else if errors.Is(err, os.ErrPermission) {
			if strict || !jsonResponse {
				responder.Status(http.StatusForbidden)
				return
			}
		} else {
			responder.Error(err, http.StatusInternalServerError)
			return
		}
	}

	if jsonResponse {
		settings, err := a.Service.GetSettings(ctx)
		if err != nil {
			responder.Error(err, http.StatusInternalServerError)
			return
		}

		responder.Data(struct {
			Name     *string `json:"name"`
			Contents string  `json:"contents"`
		}{Name: settings.Theme, Contents: string(theme)}, http.StatusOK)
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
	if themes == nil {
		themes = make([]string, 0)
	}

	responder.Data(struct {
		Themes []string `json:"themes"`
	}{Themes: themes}, http.StatusOK)
}
