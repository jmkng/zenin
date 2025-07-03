package sqlite

import (
	"database/sql/driver"
	"fmt"
	"time"
)

func NewUTCTime(t time.Time) Time {
	return Time{time: t.UTC()}
}

type Time struct {
	time time.Time
}

func (t *Time) Scan(value any) error {
	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("sqlite.Time: expected text column storage, got %T", value)
	}
	parsed, err := time.Parse(time.RFC3339, strValue)
	if err != nil {
		return fmt.Errorf("sqlite.Time: malformed time value: %v", value)
	}
	*t = NewUTCTime(parsed)
	return nil
}

func (t Time) Value() (driver.Value, error) {
	return t.time.Format(time.RFC3339), nil
}
