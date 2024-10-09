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

type PairValue struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type PairListValue []PairValue

// Value implements `driver.Valuer` for `PairListValue`.
func (p PairListValue) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan implements `sql.Scanner` for `PairListValue`.
// This allows storing and fetching the `ArrayValue` as a JSON array.
func (p *PairListValue) Scan(value any) error {
	if value == nil {
		*p = []PairValue{}
		return nil
	}
	var err error
	switch x := value.(type) {
	case string:
		err = json.Unmarshal([]byte(x), p)
	case []byte:
		err = json.Unmarshal(x, p)
	}
	return err
}
