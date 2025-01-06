package server

import (
	"errors"
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
	router.Get("/claim", a.HandleGetClaimStatus)
	router.Post("/claim", a.HandleCreateClaim)
	router.Post("/authenticate", a.HandleAuthenticate)

	//// root /////
	router.Group(func(private chi.Router) {
		private.Use(AuthenticateRoot)
		private.Post("/", a.HandleCreateAccount)
	})
	///////////////

	return router
}

func (a AccountProvider) HandleGetClaimStatus(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	claim, err := a.Service.GetClaimStatus(r.Context())
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(claim, http.StatusOK)
}

func (a AccountProvider) HandleCreateClaim(w http.ResponseWriter, r *http.Request) {
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

	// Signal intent to claim server by setting `Root`.
	application.Root = true

	acc, err := a.Service.AddAccount(r.Context(), application)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, account.ServerClaimedError) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	token, err := acc.Token()
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

func (a AccountProvider) HandleCreateAccount(w http.ResponseWriter, r *http.Request) {
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

	_, err = a.Service.AddAccount(r.Context(), application)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, account.AccountExistsError) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	responder.Status(http.StatusCreated)
}
