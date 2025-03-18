package settings

import (
	"context"
	"os"
	"path/filepath"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

// NewSettingsService returns a new `SettingsService`.
func NewSettingsService(r SettingsRepository, d chan<- any) SettingsService {
	return SettingsService{Repository: r, Distributor: d}
}

// SettingsService is a service used to interact with the settings domain type.
type SettingsService struct {
	Distributor chan<- any
	Repository  SettingsRepository
}

func (m SettingsService) GetSettings(ctx context.Context) (Settings, error) {
	settings, err := m.Repository.SelectSettings(ctx)
	if err != nil {
		return Settings{}, err
	}
	// Set defaults where expected.
	// Theme is allowed to be nil, indicating that the server has no theme preference stored.
	if settings.Delimiters == nil {
		settings.Delimiters = &internal.ArrayValue{DefaultOpenDelimiter, DefaultCloseDelimiter}
	}

	return settings, nil
}

func (m SettingsService) UpdateSettings(ctx context.Context, s Settings) error {
	if err := s.Validate(); err != nil {
		return err
	}

	// Update repository.
	if err := m.Repository.UpdateSettings(ctx, s); err != nil {
		return err
	}
	// Queue distributor settings update.
	m.Distributor <- SettingsMessage{Settings: s}

	return nil
}

// GetTheme attempts to read the preferred theme from the themes directory.
// Returns a nil slice if the repository has no theme preference.
func (m SettingsService) GetTheme(ctx context.Context) ([]byte, error) {
	settings, err := m.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	if settings.Theme == nil {
		return nil, nil
	}
	name := *settings.Theme
	path := filepath.Join(env.Env.ThemesDir, name)
	bytes, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return bytes, nil
}
