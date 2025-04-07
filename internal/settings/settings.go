package settings

import (
	"fmt"
	"strings"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

const (
	DefaultOpenDelimiter  = "{{"
	DefaultCloseDelimiter = "}}"

	DelimitersKey = "delimiters"
	ThemeKey      = "theme"
)

// Settings is the settings domain type.
type Settings struct {
	Theme      *string              `json:"theme"`
	Delimiters *internal.ArrayValue `json:"delimiters"`
}

// Validate will validate the [Settings], returning a [env.Validation] if errors are found.
func (m Settings) Validate() error {
	validation := env.NewValidation()

	var missing []string
	if m.Delimiters == nil {
		missing = append(missing, "delimiters")
	} else if len(*m.Delimiters) != 2 || strings.TrimSpace((*m.Delimiters)[0]) == "" || strings.TrimSpace((*m.Delimiters)[1]) == "" {
		validation.Push("Delimiters must be an array of two strings.")
	}
	if len(missing) > 0 {
		validation.Push(fmt.Sprintf("Missing required fields: %s.", strings.Join(missing, ", ")))
	}

	if !validation.Empty() {
		return validation
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
