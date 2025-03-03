package sqlite

import (
	"github.com/jmkng/zenin/internal/account"
	"golang.org/x/net/context"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `SQLiteRepository`.
func (s SQLiteRepository) SelectAccountTotal(ctx context.Context) (int64, error) {
	return -1, nil
}

// SelectAccount implements `AccountRepository.SelectAccount` for `SQLiteRepository`.
func (s SQLiteRepository) SelectAccount(ctx context.Context, params *account.SelectAccountParams) ([]account.Account, error) {
	return nil, nil
}

// InsertAccount implements `AccountRepository.InsertAccount` for `SQLiteRepository`.
func (s SQLiteRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	return -1, nil
}

// UpdateAccount implements `AccountRepository.UpdateAccount` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateAccount(ctx context.Context, params account.UpdateAccountParams) error {
	return nil
}

// DeleteAccount implements `AccountRepository.DeleteAccount` for `SQLiteRepository`.
func (s SQLiteRepository) DeleteAccount(ctx context.Context, id []int) error {
	return nil
}
