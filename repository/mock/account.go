package mock

import (
	"github.com/jmkng/zenin/internal/account"
	"golang.org/x/net/context"
)

// SelectAccountTotal implements `AccountRepository.SelectAccountTotal` for `MockRepository`.
func (m MockRepository) SelectAccountTotal(ctx context.Context) (int, error) {
	return -1, nil
}

// SelectAccount implements `AccountRepository.SelectAccount` for `MockRepository`.
func (m MockRepository) SelectAccount(ctx context.Context, params *account.SelectAccountParams) ([]account.Account, error) {
	return nil, nil
}

// InsertAccount implements `AccountRepository.InsertAccount` for `MockRepository`.
func (m MockRepository) InsertAccount(ctx context.Context, account account.Account) (int, error) {
	return -1, nil
}

// UpdateAccount implements `AccountRepository.UpdateAccount` for `MockRepository`.
func (m MockRepository) UpdateAccount(ctx context.Context, params account.UpdateAccountParams) error {
	return nil
}

// DeleteAccount implements `AccountRepository.DeleteAccount` for `MockRepository`.
func (m MockRepository) DeleteAccount(ctx context.Context, id []int) error {
	return nil
}
