package json

import (
	"encoding/json"
	"fmt"

	"github.com/jmkng/zenin/probe"
)

// https://go.dev/ref/spec#Conversions
//
// A non-constant value x can be converted to type T in any of these cases:
// (...) ignoring struct tags (see below), x's type and T are not type parameters but have identical underlying types.

// TagParameters converts params to an equivalent tagged parameters struct.
// Panics if params is not a parameters struct from the [probe] package.
func TagParameters(params any) any {
	switch v := params.(type) {
	case probe.Plugin:
		return Plugin(v)
	default:
		panic(fmt.Sprintf("internal/json: unknown parameters type: %T", params))
	}
}

// UntagParameters converts params to a [probe.Poller].
// Panics if params is not a recognized tagged parameters struct.
func UntagParameters(params any) probe.Poller {
	switch v := params.(type) {
	case Plugin:
		return probe.Plugin(v)
	default:
		panic(fmt.Sprintf("internal/json: unknown tagged parameters type: %T", params))
	}
}

// MarshalParameters returns the JSON encoding of params.
// Panics if params is not a parameters struct from the [probe] package,
// or marshaling fails.
func MarshalParameters(params any) []byte {
	tagged := TagParameters(params)
	b, err := json.Marshal(tagged)
	if err != nil {
		panic(fmt.Sprintf("internal/json: marshaling parameters: %T: %v", params, err))
	}
	return b
}

// UnmarshalParameters will unmarshal b into a [probe.Poller] matching id.
// Returns an error if unmarshaling fails.
// Panics if id is not a recognized [probe.ID].
func UnmarshalParameters(id probe.ID, b []byte) (probe.Poller, error) {
	switch id {
	case probe.IDPlugin:
		var v Plugin
		if err := json.Unmarshal(b, &v); err != nil {
			return nil, fmt.Errorf("internal/json: unmarshaling probe id %d parameters: %v", id, err)
		}
		return UntagParameters(v), nil
	default:
		return nil, fmt.Errorf("internal/json: unknown probe id: %d", id)
	}
}

// [probe.Plugin]
type Plugin struct {
	Path string `json:"path"`
}

// TagAttributes converts attr to an equivalent tagged attributes struct.
// Panics if attr is not an attributes struct from the [probe] package.
func TagAttributes(attr any) any {
	switch v := attr.(type) {
	case probe.PluginAttributes:
		return PluginAttributes(v)
	case probe.HTTPAttributes:
		return HTTPAttributes(v)
	default:
		panic(fmt.Sprintf("internal/json: unknown attributes type: %T", attr))
	}
}

// UntagAttributes converts attr to a [probe.Poller].
// Panics if attr is not a recognized tagged attributes struct.
func UntagAttributes(attr any) any {
	switch v := attr.(type) {
	case PluginAttributes:
		return probe.PluginAttributes(v)
	case HTTPAttributes:
		return probe.HTTPAttributes(v)
	default:
		panic(fmt.Sprintf("internal/json: unknown tagged attributes type: %T", attr))
	}
}

// MarshalAttributes returns the JSON encoding of attr.
// Panics if attr is not an attributes struct from the [probe] package,
// or marshaling fails.
func MarshalAttributes(attr any) []byte {
	tagged := TagAttributes(attr)
	b, err := json.Marshal(tagged)
	if err != nil {
		panic(fmt.Sprintf("internal/json: marshaling attributes: %T: %v", attr, err))
	}
	return b
}

// UnmarshalAttributes will unmarshal b into an attributes struct matching id.
// Returns an error if unmarshaling fails.
// Panics if id is not a recognized [probe.ID].
func UnmarshalAttributes(id probe.ID, b []byte) (any, error) {
	switch id {
	case probe.IDPlugin:
		var v PluginAttributes
		if err := json.Unmarshal(b, &v); err != nil {
			return nil, fmt.Errorf("internal/json: unmarshaling probe id %d attributes: %v", id, err)
		}
		return UntagAttributes(v), nil
	default:
		return nil, fmt.Errorf("internal/json: unknown probe id: %d", id)
	}
}

// [probe.PluginAttributes]
type PluginAttributes struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exit_code"`
}

// [probe.HTTPAttributes]
type HTTPAttributes struct{}
