package sqlite

import (
	"fmt"

	"github.com/jmkng/zenin/internal/settings"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"
)

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateSettings(ctx context.Context, se settings.Settings) error {
	delimiters := se.Delimiters
	theme := se.Theme

	query := `INSERT INTO settings ("key", text_value)
		VALUES (?, ?), (?, ?)
		ON CONFLICT ("key")
		DO UPDATE SET 
			text_value = EXCLUDED.text_value`

	_, err := s.db.ExecContext(ctx, query,
		settings.DelimitersKey, delimiters,
		settings.ThemeKey, theme,
	)

	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}

// SelectSettings implements `SettingsRepository.SelectSettings` for `SQLiteRepository`.
func (s SQLiteRepository) SelectSettings(ctx context.Context) (settings.Settings, error) {
	return common.NewCommonRepository(s.db).SelectSettings(ctx)
}
