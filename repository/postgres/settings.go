package postgres

import (
	"fmt"

	"github.com/jmkng/zenin/internal/settings"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"
)

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `PostgresRepository`.
func (p PostgresRepository) UpdateSettings(ctx context.Context, s settings.Settings) error {
	// https://www.postgresql.org/docs/current/sql-insert.html#id-1.9.3.152.6.3.3
	query := `INSERT INTO settings ("key", text_value)
	VALUES ($1, $2), ($3, $4)
	ON CONFLICT ("key")
	DO UPDATE SET
	text_value = COALESCE(excluded.text_value, settings.text_value)`

	_, err := p.db.ExecContext(ctx, query,
		settings.DelimitersKey, s.Delimiters,
		settings.ThemeKey, s.Theme)

	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}

// SelectSettings implements `SettingsRepository.SelectSettings` for `PostgresRepository`.
func (p PostgresRepository) SelectSettings(ctx context.Context) (settings.Settings, error) {
	return common.NewCommonRepository(p.db).SelectSettings(ctx)
}
