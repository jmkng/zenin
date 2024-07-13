package internal

import "strings"

// NewValidation returns a new `Validation`.
func NewValidation(messages ...string) Validation {
	return Validation{
		messages,
	}
}

// Validation contains a set of user-friendly error messages.
type Validation struct {
	messages []string
}

// Error implements `error` for `Validation`.
func (v Validation) Error() string {
	return strings.Join(v.messages, ": ")
}

// Messages returns the messages inside the `Validation`.
func (v Validation) Messages() []string {
	return v.messages
}
