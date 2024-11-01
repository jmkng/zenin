package mock

import (
	"github.com/jmkng/zenin/internal/account"
	"golang.org/x/net/context"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `MockRepository`.
func (p MockRepository) SelectAccountTotal(ctx context.Context) (int64, error) {
	return -1, nil
}

// SelectAccountByUsername implements `AccountRepository.SelectAccountByUsername` for `MockRepository`.
func (p MockRepository) SelectAccountByUsername(ctx context.Context, username string) (*account.Account, error) {
	return nil, nil
}

// InsertAccount implements `AccountRepository.InsertAccount` for `MockRepository`.
func (p MockRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	return -1, nil
}