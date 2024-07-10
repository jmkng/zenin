package server

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func MonitorMuxV1() http.Handler {
	router := chi.NewRouter()
	//router.Use(Authenticator)
	router.Get("/", HandleGetMonitors)
	router.Post("/", HandleCreateMonitor)
	router.Delete("/", HandleDeleteMonitor)
	router.Patch("/", HandleToggleMonitor)
	router.Put("/{id}", HandleReplaceMonitor)
	router.Get("/{id}/poll", HandlePollMonitor)
	return router
}

func HandleGetMonitors(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "get monitor")
}

func HandleCreateMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "create monitor")
}

func HandleDeleteMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "delete monitor")
}

func HandleToggleMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "toggle monitor")
}

func HandleReplaceMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "replace monitor")
}

func HandlePollMonitor(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "poll monitor")
}
