package postgres

import (
	"database/sql"
	"errors"
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

// SelectAccountByUsername implements `AccountRepository.SelectAccountByUsername` for `PostgresRepository`.
func (p PostgresRepository) SelectAccountByUsername(ctx context.Context, username string) (*account.Account, error) {
	var account account.Account

	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("SELECT id, username, versioned_salted_hash, root FROM account WHERE username =")
	builder.BindString(username)

	err := p.db.GetContext(ctx, &account, builder.String(), builder.Args()...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to select account by username: %w", err)
	}

	return &account, nil
}

// InsertAccount implements `AccountRepository.InsertAccount` for `PostgresRepository`.
func (p PostgresRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	if account.Id != nil {
		panic("attempting to insert account with non-nil id")
	}
	var id int

	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push(`INSERT INTO account (username, versioned_salted_hash, root) VALUES (`)
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
