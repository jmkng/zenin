package postgres

import (
	"fmt"

	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `PostgresRepository`.
func (p PostgresRepository) SelectAccountTotal(ctx context.Context) (int, error) {
	return common.NewCommonRepository(p.db).SelectAccountTotal(ctx)
}

// SelectAccount implements `AccountRepository.SelectAccount` for `PostgresRepository`.
func (p PostgresRepository) SelectAccount(ctx context.Context, params *account.SelectAccountParams) ([]account.Account, error) {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	return common.NewCommonRepository(p.db).SelectAccount(ctx, builder, params)
}

// InsertAccount implements `AccountRepository.InsertAccount` for `PostgresRepository`.
func (p PostgresRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	builder.Push(`INSERT INTO account (created_at, updated_at, username, versioned_salted_hash, root) VALUES (`)
	builder.SpreadOpaque(account.CreatedAt,
		account.UpdatedAt,
		account.Username,
		account.VersionedSaltedHash.String(),
		account.Root)
	builder.Push(") RETURNING id")

	var id int
	err := p.db.QueryRowContext(ctx, builder.String(), builder.Args()...).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("failed to insert account: %w", err)
	}
	return id, nil
}

// UpdateAccount implements `AccountRepository.UpdateAccount` for `PostgresRepository`.
func (p PostgresRepository) UpdateAccount(ctx context.Context, params account.UpdateAccountParams) error {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	return common.NewCommonRepository(p.db).UpdateAccount(ctx, builder, params)
}

// DeleteAccount implements `AccountRepository.DeleteAccount` for `PostgresRepository`.
func (p PostgresRepository) DeleteAccount(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	builder.Push("DELETE FROM account WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(") AND root = false")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}
