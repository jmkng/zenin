package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/monitor"
)

func NewFeedHandler(service monitor.MonitorService) FeedHandler {
	provider := NewFeedProvider(service)
	return FeedHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
}

type FeedHandler struct {
	Provider FeedProvider
	mux      http.Handler
}

func (f FeedHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mux.ServeHTTP(w, r)
}

func NewFeedProvider(service monitor.MonitorService) FeedProvider {
	return FeedProvider{
		Service: service,
	}
}

type FeedProvider struct {
	Service monitor.MonitorService
}

func (f FeedProvider) Mux() http.Handler {
	router := chi.NewRouter()
	router.Get("/", f.HandleSubscribe)
	return router
}

func (f FeedProvider) HandleSubscribe(w http.ResponseWriter, r *http.Request) {
	var upgrader = websocket.Upgrader{}
	if env.Runtime.Kind == env.Dev {
		// Disable origin check.
		upgrader.CheckOrigin = func(r *http.Request) bool {
			return true
		}
	}
	connection, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		env.Debug("rejected feed subscriber connection upgrade", "error", err)
		return
	}

	f.Service.Distributor <- monitor.SubscribeMessage{Subscriber: connection}
}
