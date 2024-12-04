package meta

import (
	"context"
	"io/fs"
	"path/filepath"
	"strings"

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

// GetSummary returns a `Meta` describing the state of the server.
func (m MetaService) GetSummary(ctx context.Context) (Meta, error) {
	total, err := m.Repository.SelectAccountTotal(ctx)
	if err != nil {
		return Meta{}, err
	}

	return Meta{
		IsClaimed: total > 0,
	}, nil
}

// GetPlugins returns a list of the plugins in the plugins directory.
func (m MetaService) GetPlugins() ([]string, error) {
	var plugins []string
	root := env.Runtime.PluginsDir

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		n := d.Name()
		// TODO: Limit discovery of files by platform.
		if !d.IsDir() && (strings.HasSuffix(n, ".sh") || strings.HasSuffix(n, ".ps1")) {
			rel, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			plugins = append(plugins, rel)
		}

		return nil
	})

	return plugins, err
}
