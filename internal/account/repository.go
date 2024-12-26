package account

import (
	"context"
)

// AccountRepository is a type used to interact with the account domain database table.
type AccountRepository interface {
	SelectAccountTotal(ctx context.Context) (int64, error)
	SelectAccountByUsername(ctx context.Context, username string) (*Account, error)
	InsertAccount(ctx context.Context, account Account) (int, error)
}
