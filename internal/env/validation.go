package env

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

// Push adds a new error to the `Validation`.
func (v *Validation) Push(error string) {
	v.messages = append(v.messages, error)
}

// Empty returns true if the `Validation` is storing no messages.
func (v Validation) Empty() bool {
	return len(v.messages) == 0
}

// Join will add the messages in the provided [Validation] to this one.
func (v *Validation) Join(o Validation) {
	for _, n := range o.Messages() {
		v.Push(n)
	}
}
