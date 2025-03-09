package common

import (
	"context"
	"fmt"

	"github.com/jmkng/zenin/internal/account"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

func (c CommonRepository) SelectAccountTotal(ctx context.Context) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM account;`
	err := c.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return count, fmt.Errorf("failed to select account totals: %w", err)
	}
	return count, nil
}

func (c CommonRepository) SelectAccount(ctx context.Context, builder *zsql.Builder, params *account.SelectAccountParams) ([]account.Account, error) {
	accounts := []account.Account{}

	builder.Push(`SELECT
        id "account_id",
        created_at,
        updated_at,
        username,
        versioned_salted_hash,
        root
    FROM account`)
	if params != nil {
		builder.Inject(params)
	}

	err := c.db.SelectContext(ctx, &accounts, builder.String(), builder.Args()...)
	if err != nil {
		return nil, fmt.Errorf("failed to select account: %w", err)
	}

	return accounts, nil
}

func (c CommonRepository) UpdateAccount(ctx context.Context, builder *zsql.Builder, params account.UpdateAccountParams) error {
	builder.Push("UPDATE account SET updated_at = ")
	builder.BindOpaque(params.UpdatedAt)
	builder.Push(", username = ")
	builder.BindString(params.Username)

	if params.VersionedSaltedHash != nil {
		builder.Push(", versioned_salted_hash = ")
		builder.BindString(params.VersionedSaltedHash.String())
	}

	builder.Push("WHERE id = ")
	builder.BindInt(params.Id)

	_, err := c.db.ExecContext(ctx, builder.String(), builder.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update account: %w", err)
	}

	return nil
}
