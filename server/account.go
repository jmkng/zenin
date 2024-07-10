package server

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal/account"
)

func NewAccountHandler(service account.AccountService) AccountHandler {
	provider := NewAccountProvider(service)
	return AccountHandler{
		Provider: provider,
		mux:      provider.Mux(),
	}
}

type AccountHandler struct {
	Provider AccountProvider
	mux      http.Handler
}

func (a AccountHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	a.mux.ServeHTTP(w, r)
}

func NewAccountProvider(service account.AccountService) AccountProvider {
	return AccountProvider{
		Service: service,
	}
}

type AccountProvider struct {
	Service account.AccountService
}

func (a AccountProvider) Mux() http.Handler {
	router := chi.NewRouter()
	router.Post("/claim", a.HandleClaim)
	router.Post("/authenticate", a.HandleAuthenticate)

	//// private /////
	router.Group(func(private chi.Router) {
		//private.Use(Authenticator)
		private.Post("/create", a.HandleCreate)
	})
	//////////////////

	return router
}

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

func (a AccountProvider) HandleClaim(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "claim")
}

func (a AccountProvider) HandleAuthenticate(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "authenticate")
}

func (a AccountProvider) HandleCreate(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "create")
}
