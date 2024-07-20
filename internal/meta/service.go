package meta

import (
	"context"
	"os"

	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/env"
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

func (m MetaService) GetPlugins() ([]string, error) {
	var plugins []string
	entries, err := os.ReadDir(env.Runtime.PluginDir)
	if err != nil {
		return plugins, err
	}
	for _, v := range entries {
		plugins = append(plugins, v.Name())
	}
	return plugins, nil
}
