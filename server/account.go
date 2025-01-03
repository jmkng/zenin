package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/env"
)

func NewAccountHandler(service account.AccountService) AccountHandler {
	provider := NewAccountProvider(service)
	return AccountHandler{Provider: provider, mux: provider.Mux()}
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
	router.Get("/claim", a.HandleGetClaim)
	router.Post("/claim", a.HandleCreateClaim)
	router.Post("/authenticate", a.HandleAuthenticate)

	//// private /////
	router.Group(func(private chi.Router) {
		private.Use(Authenticator)
		private.Post("/create", a.HandleCreate)
	})
	//////////////////

	return router
}

func (a AccountProvider) HandleGetClaim(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	claim, err := a.Service.GetClaim(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(claim, http.StatusOK)
}

func (a AccountProvider) HandleCreateClaim(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	count, err := a.Service.Repository.SelectAccountTotal(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return

	}
	if count > 0 {
		responder.Error(env.NewValidation("Server has already been claimed. Try logging in."),
			http.StatusBadRequest)
		return
	}

	var application account.Application
	err = StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}
	if err := application.Validate(); err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	account, err := a.Service.AddAccount(r.Context(), application)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	token, err := account.Token()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(token, http.StatusOK)
}

func (a AccountProvider) HandleAuthenticate(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	var application account.Application
	err := StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}

	account, err := a.Service.Repository.SelectAccountByUsername(r.Context(), application.Username)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if account == nil || a.Service.ValidateLogin([]byte(application.PasswordPlainText), account.VersionedSaltedHash) != nil {
		responder.Error(env.NewValidation("Invalid username or password."),
			http.StatusBadRequest)
		return
	}

	token, err := account.Token()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(token, http.StatusOK)
}

func (a AccountProvider) HandleCreate(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	var application account.Application
	err := StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}
	if err := application.Validate(); err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	exists, err := a.Service.AccountExists(r.Context(), application.Username)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if exists {
		responder.Error(env.NewValidation("Username is taken. Try another."),
			http.StatusBadRequest)
		return
	}

	_, err = a.Service.AddAccount(r.Context(), application)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Status(http.StatusCreated)
}
