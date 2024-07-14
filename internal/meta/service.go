package meta

import (
	"context"

	"github.com/jmkng/zenin/internal/account"
)

// NewMetaService returns a new `MetaService`.
func NewMetaService(repository account.AccountRepository) MetaService {
	return MetaService{Repository: repository}
}

// MetaService is a service used to interact with the account domain type.
type MetaService struct {
	Repository account.AccountRepository
}

func (m MetaService) GetSummary(ctx context.Context) (Meta, error) {
	total, err := m.Repository.SelectAccountTotal(ctx)
	if err != nil {
		return Meta{}, err
	}

	return Meta{
		IsClaimed: total > 0,
	}, nil
}
