package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal/meta"
)

func NewMetaHandler(service meta.MetaService) MetaHandler {
	provider := NewMetaProvider(service)
	return MetaHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
}

type MetaHandler struct {
	Provider MetaProvider
	mux      http.Handler
}

func (a MetaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	a.mux.ServeHTTP(w, r)
}

func NewMetaProvider(service meta.MetaService) MetaProvider {
	return MetaProvider{
		Service: service,
	}
}

type MetaProvider struct {
	Service meta.MetaService
}

func (a MetaProvider) Mux() http.Handler {
	router := chi.NewRouter()
	router.Get("/", a.HandleSummary)

	//// private /////
	router.Group(func(private chi.Router) {
		private.Use(Authenticator)
		router.Get("/plugins", a.HandlePlugins)
	})
	//////////////////

	return router
}

func (a MetaProvider) HandleSummary(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	summary, err := a.Service.GetSummary(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	responder.Data(summary, http.StatusOK)
}

func (a MetaProvider) HandlePlugins(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	plugins, err := a.Service.GetPlugins()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(plugins, http.StatusOK)
}
