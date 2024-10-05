package internal

import (
	"database/sql/driver"
	"encoding/json"
)

type ArrayValue []string

// Value implements `driver.Valuer` for `ArrayValue`.
func (h ArrayValue) Value() (driver.Value, error) {
	return json.Marshal(h)
}

// Scan implements `sql.Scanner` for `ArrayValue`.
// This allows storing and fetching the `ArrayValue` as a JSON array.
func (h *ArrayValue) Scan(value any) error {
	if value == nil {
		*h = []string{}
		return nil
	}
	var err error
	switch x := value.(type) {
	case string:
		err = json.Unmarshal([]byte(x), h)
	case []byte:
		err = json.Unmarshal(x, h)
	}
	return err
}
