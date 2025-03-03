package sqlite

import (
	"github.com/jmkng/zenin/internal/settings"
	"golang.org/x/net/context"
)

// SelectDelimiters implements `SettingsRepository.SelectDelimiters` for `SQLiteRepository`.
func (s SQLiteRepository) SelectDelimiters(ctx context.Context) ([]string, error) {
	return []string{}, nil
}

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateSettings(ctx context.Context, settings settings.Settings) error {
	return nil
}
