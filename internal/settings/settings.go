package settings

import (
	"strings"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

const (
	DefaultOpenDelimiter  string = "{{"
	DefaultCloseDelimiter string = "}}"
)

// Settings is the settings domain type.
type Settings struct {
	Delimiters internal.ArrayValue `json:"delimiters"`
}

func (m Settings) Validate() error {
	var errors []string
	if len(m.Delimiters) != 2 || strings.TrimSpace(m.Delimiters[0]) == "" || strings.TrimSpace(m.Delimiters[1]) == "" {
		errors = append(errors, "value for field `delimiters` is required")
	}

	if len(errors) > 0 {
		return env.NewValidation(errors...)
	}
	return nil
}

// TextValue is a string value container for the settings domain type.
type TextValue struct {
	SettingsFields
	Value string `json:"value" db:"text_value"`
}

// ArrayValue is a JSON array value container for the settings domain type.
type ArrayValue struct {
	SettingsFields
	Value internal.ArrayValue `json:"value" db:"text_value"`
}

type SettingsFields struct {
	Key string `json:"key" db:"key"`
}

// SettingsMessage is used to deliver a `Settings` to the distributor.
type SettingsMessage struct {
	Settings Settings
}