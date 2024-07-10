package server

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Application represents an attempt to create a new `Account`.
type Application struct {
	Username          string `json:"username"`
	PasswordPlainText string `json:"password"`
}

// Validate will check the `Application` for invalid data,
// returning a series of user-friendly error messages for each problem.
func (a Application) Validate() []string {
	panic("todo application validation")
}

// AccountMuxV1 registers v1 routes on the provided `Bundle`.
func AccountMuxV1() http.Handler {
	router := chi.NewRouter()
	router.Post("/claim", HandleClaim)
	router.Post("/authenticate", HandleAuthenticate)

	//// private /////
	router.Group(func(private chi.Router) {
		//private.Use(Authenticator)
		private.Post("/create", HandleCreate)
	})
	//////////////////

	return router
}

func HandleClaim(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "claim")
}

func HandleAuthenticate(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "authenticate")
}

func HandleCreate(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "create")
}
