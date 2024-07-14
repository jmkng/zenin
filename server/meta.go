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
	return router
}

// HandleClaim reads an `Application` from the request body and attempts to
// create the first meta on the server.
func (a MetaProvider) HandleSummary(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	summary, err := a.Service.GetSummary(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return

	}
	responder.Data(summary, http.StatusOK)
}
