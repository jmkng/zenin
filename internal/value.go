package internal

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
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

// NewTimeValue returns a new `TimeValue` with the location set to UTC.
func NewTimeValue(t time.Time) TimeValue {
	return TimeValue{time: t.UTC()}
}

// TimeValue is a wrapper for `time.Time` that allows scanning from all repository implementations.
type TimeValue struct {
	time time.Time
}

// Scan implements `sql.Scanner` for `TimeValue`
func (t *TimeValue) Scan(value any) error {
	switch v := value.(type) {
	// Text storage. (SQLite)
	case string:
		var f []string = []string{
			time.DateTime, // Result of SQLite CUSTOM_TIMESTAMP
			time.RFC3339,
		}
		for _, x := range f {
			parsed, err := time.Parse(x, v)
			if err == nil {
				*t = NewTimeValue(parsed)
				return nil
			}
		}
	// Timestamp storage. (Postgres)
	case time.Time:
		*t = NewTimeValue(v)
		return nil
	}

	return fmt.Errorf("unsupported scan type for time: %T", value)
}

// Time returns the internal `time.Time`.
func (t TimeValue) Time() time.Time {
	return t.time
}

// Value implements `driver.Valuer` for `TimeValue`.
func (t TimeValue) Value() (driver.Value, error) {
	return t.time.Format(time.RFC3339), nil
}

// MarshalJSON implements `json.Marshaler` for `TimeValue`.
func (t TimeValue) MarshalJSON() ([]byte, error) {
	return []byte(`"` + t.time.Format(time.RFC3339) + `"`), nil
}

// UnmarshalJSON implements `json.Unmarshaler` for `TimeValue`.
func (t *TimeValue) UnmarshalJSON(data []byte) error {
	// Taken from https://go.dev/src/time/time.go
	if string(data) == "null" {
		return nil
	}
	if len(data) < 2 || data[0] != '"' || data[len(data)-1] != '"' {
		return errors.New("expected a JSON string")
	}
	data = data[len(`"`) : len(data)-len(`"`)]

	var v string
	formats := []string{
		time.RFC3339,
		time.DateTime,
	}

	for _, format := range formats {
		parsed, err := time.Parse(format, string(data))
		if err == nil {
			*t = NewTimeValue(parsed)
			return nil
		}
	}

	return fmt.Errorf("failed to parse time: %v", v)
}

// TimestampValue represents a timestamp.
type TimestampValue struct {
	Time TimeValue `json:"time"`
}

// CreatedTimestampValue represents a created resource.
type CreatedTimestampValue struct {
	Id int `json:"id"`
	TimestampValue
}
