package common

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmkng/zenin/internal"
)

func (c CommonRepository) SelectDelimiters(ctx context.Context) ([]string, error) {
	var value internal.ArrayValue
	query := `select text_value from settings WHERE "key" = 'delimiters'`
	err := c.db.GetContext(ctx, &value, query)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []string{}, nil
		}
		return []string{}, fmt.Errorf("failed to select delimiters: %w", err)
	}

	return value, nil
}
