package sqlite

import (
	"fmt"

	"github.com/jmkng/zenin/internal/settings"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"
)

// SelectDelimiters implements `SettingsRepository.SelectDelimiters` for `SQLiteRepository`.
func (s SQLiteRepository) SelectDelimiters(ctx context.Context) ([]string, error) {
	return common.NewCommonRepository(s.db).SelectDelimiters(ctx)
}

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateSettings(ctx context.Context, settings settings.Settings) error {
	delimiters := settings.Delimiters

	query := `INSERT INTO settings ("key", text_value)
		VALUES (?, ?)
		ON CONFLICT ("key")
		DO UPDATE SET 
			text_value = COALESCE(?, text_value)`
	_, err := s.db.ExecContext(ctx, query, "delimiters", delimiters, delimiters)

	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}
