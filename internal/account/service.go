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
var ServerClaimedError env.Validation = env.NewValidation("The server has already been claimed. Try logging in.")

// AccountExistsError means that an account cannot be created because an account with that name already exists.
var AccountExistsError env.Validation = env.NewValidation("Username is taken. Try another.")

func (a AccountService) AddAccount(ctx context.Context, app CreateApplication) (Account, error) {
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

func (a AccountService) UpdateAccount(ctx context.Context, id int, app UpdateApplication) error {
	// id is the id of the account we are updating.
	// app describes the new information to be assigned to that account.
	validation := env.NewValidation()

	if err := app.Validate(); err != nil {
		validation.Join(err.(env.Validation))
	}

	// Check for available username.
	accounts, err := a.Repository.SelectAccount(ctx, &SelectAccountParams{
		Username: &app.Username,
	})
	if err != nil {
		return err
	}
	// This might return one account because the username is unchanged.
	// If the ids are not the same, some other account already has this username.
	if len(accounts) == 1 && *accounts[0].Id != id {
		validation.Join(AccountExistsError)
	}
	if !validation.Empty() {
		return validation
	}

	params := UpdateAccountParams{
		Id:                  id,
		Username:            app.Username,
		VersionedSaltedHash: nil,
	}

	// Handle the new password, if one was provided.
	if app.PasswordPlainText != nil {
		salt, err := env.GetRandomBytes(ZeninAccSaltLength)
		if err != nil {
			return err
		}
		vsh, err := GetCurrentScheme().Hash([]byte(*app.PasswordPlainText), salt)
		if err != nil {
			return fmt.Errorf("failed to generate versioned salted hash: %w", err)
		}
		params.VersionedSaltedHash = &vsh
	}

	err = a.Repository.UpdateAccount(ctx, params)
	if err != nil {
		return err
	}

	return nil
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
