package server

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jmkng/zenin/internal"
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

	///// root /////
	router.Group(func(private chi.Router) {
		private.Use(Authenticate)
		private.Get("/", a.HandleGetAccounts)
		private.Post("/", a.HandleCreateAccount)
		private.Delete("/", a.HandleDeleteAccount)
		private.Patch("/{id}", a.HandleUpdateAccount)
	})
	//////////////////

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

	var application account.CreateApplication

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

	account, err := a.Service.AddAccount(r.Context(), application)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.As(err, &env.Validation{}) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	token, err := account.Token()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(struct {
		Token string `json:"token"`
	}{Token: token}, http.StatusOK)
}

func (a AccountProvider) HandleAuthenticate(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	var application account.CreateApplication

	err := StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}

	params := &account.SelectAccountParams{
		Username: &application.Username,
	}
	account, err := a.Service.Repository.SelectAccount(r.Context(), params)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}
	if len(account) == 0 || a.Service.ValidateLogin([]byte(application.PasswordPlainText), account[0].VersionedSaltedHash) != nil {
		responder.Error(env.NewValidation("Invalid username or password."),
			http.StatusBadRequest)
		return
	}

	token, err := account[0].Token()
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(token, http.StatusOK)
}

func (a AccountProvider) HandleGetAccounts(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	token, ok := r.Context().Value("token").(Token)
	if !ok || !token.Root {
		responder.Status(http.StatusUnauthorized)
		return
	}

	query := r.URL.Query()
	var params *account.SelectAccountParams

	if n := query.Get("username"); n != "" {
		params = &account.SelectAccountParams{
			Username: &n,
		}
	}

	accounts, err := a.Service.Repository.SelectAccount(r.Context(), params)
	if err != nil {
		responder.Error(err, http.StatusInternalServerError)
		return
	}

	responder.Data(accounts, http.StatusOK)
}

func (a AccountProvider) HandleCreateAccount(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	token, ok := r.Context().Value("token").(Token)
	if !ok || !token.Root {
		responder.Status(http.StatusUnauthorized)
		return
	}

	var application account.CreateApplication

	err := StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}

	account, err := a.Service.AddAccount(r.Context(), application)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.As(err, &env.Validation{}) {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	responder.Data(internal.CreatedTimestampValue{
		Id: *account.Id,
		TimestampValue: internal.TimestampValue{
			Time: account.CreatedAt,
		},
	}, http.StatusCreated)
}

func (a AccountProvider) HandleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	query := r.URL.Query()

	param := chi.URLParam(r, "id")
	id, err := strconv.Atoi(param)
	if err != nil {
		responder.Error(env.NewValidation("Expected integer url parameter."),
			http.StatusBadRequest)
		return
	}

	var reissue bool
	if n := query.Get("reissue"); n != "" {
		if re, err := strconv.ParseBool(n); err == nil && re {
			reissue = true
		}
	}

	ctx := r.Context()

	// Root accounts can update anyone.
	// If this isn't a root account, the request must be from the same account that the update is for.
	token, ok := ctx.Value(TokenKey).(Token)
	if !ok || !token.Root && id != token.Id {
		responder.Status(http.StatusUnauthorized)
		return
	}

	var application account.UpdateApplication
	err = StrictDecoder(r.Body).Decode(&application)
	if err != nil {
		responder.Error(env.NewValidation("Expected `username` and `password` keys."),
			http.StatusBadRequest)
		return
	}

	time, err := a.Service.UpdateAccount(ctx, id, application)
	if err != nil {
		status := http.StatusInternalServerError
		if _, ok := err.(env.Validation); ok {
			status = http.StatusBadRequest
		}

		responder.Error(err, status)
		return
	}

	// Issue a new token, if requested.
	if reissue {
		accounts, err := a.Service.Repository.SelectAccount(ctx, &account.SelectAccountParams{
			Username: &application.Username,
		})
		if err != nil || len(accounts) != 1 {
			responder.Error(err, http.StatusInternalServerError)
			return
		}

		token, err := accounts[0].Token()
		if err != nil {
			responder.Error(err, http.StatusInternalServerError)
			return
		}

		responder.Data(struct {
			Token string `json:"token"`
			internal.TimestampValue
		}{
			Token:          token,
			TimestampValue: time,
		}, http.StatusOK)
		return
	}

	responder.Data(time, http.StatusOK)
}

func (a AccountProvider) HandleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)

	id := scanQueryParameterIds(r.URL.Query())
	if len(id) == 0 {
		responder.Error(env.NewValidation("Expected `id` query parameter."),
			http.StatusBadRequest)
		return
	}

	err := a.Service.Repository.DeleteAccount(r.Context(), id)
	if err != nil {
		responder.Error(err, http.StatusBadRequest)
		return
	}

	responder.Status(http.StatusOK)
}
