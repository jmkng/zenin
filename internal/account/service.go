package account

import (
	"context"
	"fmt"

	"github.com/jmkng/zenin/internal/env"
)

// NewAccountService returns a new `AccountService`.
func NewAccountService(repository AccountRepository) AccountService {
	return AccountService{repository}
}

// AccountService is a service used to interact with the account domain type.
type AccountService struct {
	Repository AccountRepository
}

func (a AccountService) GetClaimStatus(ctx context.Context) (bool, error) {
	total, err := a.Repository.SelectAccountTotal(ctx)
	if err != nil {
		return false, err
	}

	return total > 0, nil
}

// ServerClaimedError means that the server cannot be claimed because it has already been claimed.
var ServerClaimedError error = env.
	NewValidation("The server has already been claimed. Try logging in.")

// AccountExistsError means that an account cannot be created because an account with that name already exists.
var AccountExistsError error = env.
	NewValidation("Username is taken. Try another.")

func (a AccountService) AddAccount(ctx context.Context, app Application) (Account, error) {
	// Attempts to claim an already claimed server must be rejected.
	if app.Root {
		claimed, err := a.GetClaimStatus(ctx)
		if err != nil {
			return Account{}, err
		}
		if claimed {
			return Account{}, ServerClaimedError
		}
	}

	// Check for existing account.
	exists, err := a.AccountExists(ctx, app.Username)
	if err != nil {
		return Account{}, err
	}
	if exists {
		return Account{}, AccountExistsError
	}

	salt, err := env.GetRandomBytes(ZeninAccSaltLength)
	if err != nil {
		return Account{}, err
	}
	vsh, err := GetCurrentScheme().Hash([]byte(app.PasswordPlainText), salt)
	if err != nil {
		return Account{}, fmt.Errorf("failed to generate versioned salted hash: %w", err)
	}

	account := Account{
		Id:                  nil,
		Username:            app.Username,
		VersionedSaltedHash: vsh,
		Root:                app.Root,
	}
	id, err := a.Repository.InsertAccount(ctx, account)
	if err != nil {
		return Account{}, err
	}

	account.Id = &id

	return account, nil
}

func (a AccountService) ValidateLogin(password []byte, target VersionedSaltedHash) error {
	return NewSchemeFromId(target.SchemeId).
		Validate(password, target)
}

func (a AccountService) AccountExists(ctx context.Context, username string) (bool, error) {
	params := &SelectAccountParams{
		Username: &username,
	}

	account, err := a.Repository.SelectAccount(ctx, params)
	if err != nil {
		return false, err
	}
	if len(account) > 0 {
		return true, nil
	}

	return false, nil
}
