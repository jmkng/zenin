package postgres

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/settings"
	"golang.org/x/net/context"
)

// SelectDelimiters implements `SettingsRepository.SelectDelimiters` for `PostgresRepository`.
func (p PostgresRepository) SelectDelimiters(ctx context.Context) ([]string, error) {
	var value internal.ArrayValue

	query := `select text_value from settings WHERE "key" = 'delimiters'`
	err := p.db.GetContext(ctx, &value, query)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []string{}, nil
		}
		return []string{}, fmt.Errorf("failed to select delimiters: %w", err)
	}

	return value, nil
}

// UpdateSettings implements `SettingsRepository.UpdateSettings` for `PostgresRepository`.
func (p PostgresRepository) UpdateSettings(ctx context.Context, m settings.Settings) error {
	query := `INSERT INTO settings ("key", text_value)
		VALUES ($1, $2)
		ON CONFLICT ("key")
		DO UPDATE SET text_value = $2`
	_, err := p.db.ExecContext(ctx, query, "delimiters", m.Delimiters)

	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}
