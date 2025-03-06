package internal

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
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

// TimeValue is a wrapper for `time.Time` that allows scanning from all repository implementations.
type TimeValue time.Time

// Scan implements `sql.Scanner` for `TimeValue`
func (t *TimeValue) Scan(value interface{}) error {
	switch v := value.(type) {
	// Text storage. (SQLite)
	case string:
		parsed, err := time.Parse("2006-01-02 15:04:05", v)
		if err != nil {
			return err
		}
		*t = TimeValue(parsed)
		return nil
	// Timestamp storage. (Postgres)
	case time.Time:
		*t = TimeValue(v)
		return nil
	}
	return fmt.Errorf("unsupported scan type for time: %T", value)
}

func (t TimeValue) MarshalJSON() ([]byte, error) {
	formatted := time.Time(t).Format(time.RFC3339)
	return []byte(`"` + formatted + `"`), nil
}

// TimestampValue represents a timestamp.
type TimestampValue struct {
	Time time.Time `json:"time"`
}

// CreatedTimestampValue represents a created resource.
type CreatedTimestampValue struct {
	Id int `json:"id"`
	TimestampValue
}
