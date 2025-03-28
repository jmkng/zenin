package common

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/settings"
)

func (c CommonRepository) SelectSettings(ctx context.Context) (settings.Settings, error) {
	query := `SELECT "key", text_value FROM settings`
	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return settings.Settings{}, fmt.Errorf("failed to select settings: %w", err)
	}
	defer rows.Close()

	var result settings.Settings
	for rows.Next() {
		var key string
		var text *string
		if err := rows.Scan(&key, &text); err != nil {
			return settings.Settings{}, fmt.Errorf("failed to scan settings row: %w", err)
		}

		switch key {
		case "theme":
			result.Theme = text
		case "delimiters":
			if text == nil {
				continue
			}
			var delimiters internal.ArrayValue
			bytes := []byte(*text)
			if err := json.Unmarshal(bytes, &delimiters); err != nil {
				return settings.Settings{}, fmt.Errorf("failed to unmarshal delimiters: %w", err)
			}
			result.Delimiters = &delimiters
		}
	}
	if err := rows.Err(); err != nil {
		return settings.Settings{}, fmt.Errorf("failed to iterate over settings rows: %w", err)
	}

	return result, nil
}
