package mock

import (
	"github.com/jmkng/zenin/internal/settings"
	"golang.org/x/net/context"
)

// SelectDelimiters implements `SettingsRepository.SelectDelimiters` for `MockRepository`.
func (m MockRepository) SelectDelimiters(ctx context.Context) ([]string, error) {
	return []string{}, nil
}

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `MockRepository`.
func (m MockRepository) UpdateSettings(ctx context.Context, settings settings.Settings) error {
	return nil
}
