package probe

import (
	"context"

	"golang.org/x/exp/constraints"
)

type Poller interface {
	Poll(ctx context.Context) Output
}

// State is the result of a poll operation.
// The zero value is invalid.
type State int8

const (
	StateInvalid State = 0
	StateOk      State = 1
	StateWarn    State = 2
	StateDead    State = 3
)

// IsValidState returns a true if value is a valid [State].
func IsValidState[T constraints.Integer](value T) bool {
	switch value {
	case 1, 2, 3:
		return true
	}
	return false
}

// Output is the raw output of a probe.
//
// May contain probe-specific attributes that are generally unused by the system,
// but may be interesting for the client.
type Output struct {
	// Resource state.
	State State
	// Messages for the client.
	// These exist to help the client understand why the state was used.
	Hints []string

	// Probe-specific information.
	// An opaque value that the system does not use.
	//
	// If the caller is interested in the additional information,
	// they are expected to type assert to one of the "*Attributes" types.
	//
	// Ex. [PluginAttributes]
	Attributes any
}

// Downgrade will degrade the [Output] state if s is "below" the current state.
// For example, downgrading from [StateOk] to [StateWarn] is allowed,
// but [StateDead] to [StateWarn] is a no-op.
func (o *Output) Downgrade(s State) {
	if o.State == StateOk {
		o.State = s
	} else if o.State == StateWarn && s == StateDead {
		o.State = StateDead
	}
}

// IsValidID returns a true if value is a valid [ID].
func IsValidID[T constraints.Integer](value T) bool {
	switch value {
	case 1:
		return true
	}
	return false
}

// ID is a unique probe identifier.
// The zero value is invalid.
type ID int8

const (
	IDInvalid ID = 0
	IDPlugin  ID = 1
)
