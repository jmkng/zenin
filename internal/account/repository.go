package account

import (
	"context"
	"fmt"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/pkg/sql"
)

// AccountRepository is a type used to interact with the account domain database table.
type AccountRepository interface {
	SelectAccountTotal(ctx context.Context) (int, error)
	SelectAccount(ctx context.Context, params *SelectAccountParams) ([]Account, error)
	InsertAccount(ctx context.Context, account Account) (int, error)
	UpdateAccount(ctx context.Context, params UpdateAccountParams) error
	DeleteAccount(ctx context.Context, id []int) error
}

// SelectAccountParams is a set of parameters used to narrow the scope of the `SelectAccount` repository method.
//
// Implements `Injectable.Inject`, so it can automatically apply suitable SQL to a `sql.Builder`.
type SelectAccountParams struct {
	Username *string
}

// Inject implements `Injectable.Inject` for `SelectAccountParams`.
func (s SelectAccountParams) Inject(builder *sql.Builder) {
	if s.Username != nil {
		builder.Push(fmt.Sprintf("%v username = ", builder.Where()))
		builder.BindString(*s.Username)
	}
}

// UpdateAccountParams is a set of parameters used to narrow the scope of the `UpdateAccount` repository method.
type UpdateAccountParams struct {
	Id                  int
	UpdatedAt           internal.TimeValue
	Username            string
	VersionedSaltedHash *VersionedSaltedHash
}
