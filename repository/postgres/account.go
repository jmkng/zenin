package postgres

import (
	"fmt"

	"github.com/jmkng/zenin/internal/account"
	zsql "github.com/jmkng/zenin/pkg/sql"
	"golang.org/x/net/context"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `PostgresRepository`.
func (p PostgresRepository) SelectAccountTotal(ctx context.Context) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM account;`
	err := p.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return count, fmt.Errorf("failed to select account totals: %w", err)
	}
	return count, nil
}

func (p PostgresRepository) SelectAccount(ctx context.Context, params *account.SelectAccountParams) ([]account.Account, error) {
	accounts := []account.Account{}

	var builder = zsql.NewBuilder(zsql.Numbered)
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

	err := p.db.SelectContext(ctx, &accounts, builder.String(), builder.Args()...)
	if err != nil {
		return nil, fmt.Errorf("failed to select account: %w", err)
	}

	return accounts, nil
}

// InsertAccount implements `AccountRepository.InsertAccount` for `PostgresRepository`.
func (p PostgresRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	if account.Id != nil {
		panic("attempting to insert account with non-nil id")
	}
	var id int

	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push(`INSERT INTO account (created_at, updated_at, username, versioned_salted_hash, root) VALUES (`)
	builder.SpreadOpaque(account.CreatedAt, account.UpdatedAt)
	builder.Push(",")
	builder.SpreadString(account.Username, account.VersionedSaltedHash.String())
	builder.Push(",")
	builder.SpreadBool(account.Root)
	builder.Push(") RETURNING id")

	err := p.db.QueryRowContext(ctx, builder.String(), builder.Args()...).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("failed to insert account: %w", err)
	}
	return id, nil
}

// UpdateAccount implements `AccountRepository.UpdateAccount` for `PostgresRepository`.
func (p PostgresRepository) UpdateAccount(ctx context.Context, params account.UpdateAccountParams) error {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("UPDATE account SET updated_at = ")
	builder.BindTime(params.UpdatedAt)
	builder.Push(", username = ")
	builder.BindString(params.Username)
	if params.VersionedSaltedHash != nil {
		builder.Push(", versioned_salted_hash = ")
		builder.BindString(params.VersionedSaltedHash.String())
	}
	builder.Push("WHERE id = ")
	builder.BindInt(params.Id)

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update account: %w", err)
	}

	return nil
}

// DeleteAccount implements `AccountRepository.DeleteAccount` for `PostgresRepository`.
func (p PostgresRepository) DeleteAccount(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("DELETE FROM account WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(") AND root = 'f'")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}
