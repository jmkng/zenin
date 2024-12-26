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

func (a AccountService) GetClaim(ctx context.Context) (bool, error) {
	total, err := a.Repository.SelectAccountTotal(ctx)
	if err != nil {
		return false, err
	}

	return total > 0, nil
}

func (a AccountService) AddAccount(ctx context.Context, application Application) (Account, error) {
	salt, err := env.GetRandomBytes(ZeninAccSaltLength)
	if err != nil {
		return Account{}, err
	}
	vsh, err := GetCurrentScheme().Hash([]byte(application.PasswordPlainText), salt)
	if err != nil {
		return Account{}, fmt.Errorf("failed to generate versioned salted hash: %w", err)
	}

	account := Account{
		Id:                  nil,
		Username:            application.Username,
		VersionedSaltedHash: vsh,
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
	account, err := a.Repository.SelectAccountByUsername(ctx, username)
	if err != nil {
		return false, err
	}
	if account != nil {
		return true, nil
	}

	return false, nil
}
