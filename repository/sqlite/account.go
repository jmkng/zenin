package sqlite

import (
	"fmt"

	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `SQLiteRepository`.
func (s SQLiteRepository) SelectAccountTotal(ctx context.Context) (int, error) {
	return common.NewCommonRepository(s.db).SelectAccountTotal(ctx)
}

// SelectAccount implements `AccountRepository.SelectAccount` for `SQLiteRepository`.
func (s SQLiteRepository) SelectAccount(ctx context.Context, params *account.SelectAccountParams) ([]account.Account, error) {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	return common.NewCommonRepository(s.db).SelectAccount(ctx, builder, params)
}

// InsertAccount implements `AccountRepository.InsertAccount` for `SQLiteRepository`.
func (s SQLiteRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	builder.Push(`INSERT INTO account (created_at, updated_at, username, versioned_salted_hash, root) VALUES (`)
	builder.SpreadOpaque(account.CreatedAt,
		account.UpdatedAt,
		account.Username,
		account.VersionedSaltedHash.String(),
		account.Root)
	builder.Push(")")

	result, err := s.db.ExecContext(ctx, builder.String(), builder.Args()...)
	if err != nil {
		return 0, fmt.Errorf("failed to insert account: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get insert id: %w", err)
	}

	return int(id), nil
}

// UpdateAccount implements `AccountRepository.UpdateAccount` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateAccount(ctx context.Context, params account.UpdateAccountParams) error {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	return common.NewCommonRepository(s.db).UpdateAccount(ctx, builder, params)
}

// DeleteAccount implements `AccountRepository.DeleteAccount` for `SQLiteRepository`.
func (s SQLiteRepository) DeleteAccount(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	builder.Push("DELETE FROM account WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(") AND root = 0")

	_, err := s.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}
