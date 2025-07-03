package json

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type Slice[T any] []T

func (j *Slice[T]) UnmarshalJSON(data []byte) error {
	var t []T
	if err := json.Unmarshal(data, &t); err != nil {
		return fmt.Errorf("json.Slice: unmarshal error: %w", err)
	}
	*j = t
	return nil
}

func (j Slice[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal([]T(j))
}

func (j *Slice[T]) Scan(value any) error {
	var t []byte
	switch v := value.(type) {
	case []byte:
		t = v
	case string:
		t = []byte(v)
	default:
		return fmt.Errorf("json.Slice: expected string or []byte, got %T", value)
	}
	return j.UnmarshalJSON(t)
}

func (j Slice[T]) Value() (driver.Value, error) {
	b, err := j.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("json.Slice: marshal error: %w", err)
	}
	return string(b), nil
}
