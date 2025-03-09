// Package sql implements a simple query builder.
package sql

import (
	"fmt"
	"strings"
	"time"
)

// Injectable is a type that can interact with a `Builder`, typically to inject some SQL.
type Injectable interface {
	Inject(builder *Builder)
}

// Separator is a string that is either "WHERE" or "AND".
type Separator string

const (
	Where Separator = "WHERE"
	And   Separator = "AND"
)

// NewWhereBuilder returns a new `WhereBuilder`.
func NewWhereBuilder() *WhereBuilder {
	return &WhereBuilder{
		state: Where,
	}
}

// WhereBuilder is used to place a "WHERE" or "AND" in an SQL query.
// See the `String` method for details.
//
// Create a `WhereBuilder` by calling the `Where` method on `Builder`.
// Each instance maintains a separate state.
type WhereBuilder struct {
	state Separator
}

// Implements `Stringer` for `WhereBuilder`.
//
// Returns "WHERE" a single time, and then "AND" every time after that.
func (w *WhereBuilder) String() string {
	if w.state == Where {
		w.state = And
		return "WHERE"
	} else {
		return "AND"
	}
}

// NewBuilder returns a new `Builder`.
//
// `Builder` has an instance of `WhereBuilder` inside of it, which can be accessed
// via the `Where` method.
func NewBuilder(marker BindMarker) *Builder {
	return &Builder{
		query:  strings.Builder{},
		args:   []any{},
		marker: NewMarkerBuilder(marker),
		where:  NewWhereBuilder(),
	}
}

// Builder maintains an internal buffer of text and a series of arguments.
// Helpful for building SQL queries.
type Builder struct {
	query  strings.Builder
	args   []any
	marker *MarkerBuilder
	where  *WhereBuilder
}

// Advance will advance the internal `MarkerBuilder` count by the provided value.
//
// This is useful when building a query that combines hardcoded and dynamically appended bind markers.
func (b *Builder) Advance(value int) {
	if b.marker.marker != NumberPositional {
		return
	}
	b.marker.count += value
}

// Reset will reset the `Builder` to the state returned by `NewBuilder`.
func (b *Builder) Reset() {
	b.query.Reset()
	b.args = nil
	b.marker.Reset()
}

// String implements `Stringer` for `Builder`.
//
// Returns the internal buffer.
func (b *Builder) String() string {
	return b.query.String()
}

// Return the arguments within the `Builder`.
func (b Builder) Args() []any {
	return b.args
}

// PushArgs will push a series of arguments to the argument stack.
func (b *Builder) PushArgs(args ...any) {
	b.args = append(b.args, args...)
}

// Push will add a new string to the internal buffer.
//
// It will automatically add whitespace to the beginning of the provided string,
// if the internal buffer does not currently end with whitespace.
func (b *Builder) Push(q string) {
	if b.query.Len() > 0 && !strings.HasSuffix(b.query.String(), " ") && !strings.HasPrefix(q, " ") {
		b.query.WriteString(fmt.Sprintf(" %v", q))
	} else {
		b.query.WriteString(q)
	}
}

// BindOpaque will push a bind marker to the internal buffer,
// and add the provided argument to the argument stack.
func (b *Builder) BindOpaque(arg any) {
	b.pushMarker()
	b.pushArg(arg)
}

// BindBool will push a bind marker to the internal buffer,
// and add the provided boolean to the argument stack.
func (b *Builder) BindBool(arg bool) {
	b.pushMarker()
	b.pushArg(arg)
}

// BindString will push a bind marker to the internal buffer,
// and add the provided string to the argument stack.
func (b *Builder) BindString(arg string) {
	b.pushMarker()
	b.pushArg(arg)
}

// BindTime will push a bind marker to the internal buffer,
// and add the provided `time.Time` to the argument stack.
func (b *Builder) BindTime(arg time.Time) {
	b.pushMarker()
	b.pushArg(arg)
}

// BindInt will push a bind marker to the internal buffer,
// and add the provided int to the argument stack.
func (b *Builder) BindInt(arg int) {
	b.pushMarker()
	b.pushArg(arg)
}

// SpreadString will spread any number of string arguments into a comma separated list
// using bind markers.
func (b *Builder) SpreadString(values ...string) {
	opaque := make([]any, len(values))
	for i, v := range values {
		opaque[i] = v
	}
	b.SpreadOpaque(opaque...)
}

// SpreadInt will spread any number of int arguments into a comma separated list
// using bind markers.
func (b *Builder) SpreadInt(values ...int) {
	opaque := make([]any, len(values))
	for i, v := range values {
		opaque[i] = v
	}
	b.SpreadOpaque(opaque...)
}

// SpreadBool will spread any number of bool arguments into a comma separated list
// using bind markers.
func (b *Builder) SpreadBool(values ...bool) {
	opaque := make([]any, len(values))
	for i, v := range values {
		opaque[i] = v
	}
	b.SpreadOpaque(opaque...)
}

func (b *Builder) SpreadOpaque(values ...any) {
	for i, v := range values {
		b.pushArg(v)
		if i+1 < len(values) {
			s := fmt.Sprintf("%v,", b.marker)
			b.Push(s)
		} else {
			b.pushMarker()
		}
	}
}

func (b *Builder) pushMarker() {
	b.Push(b.marker.String())
}

func (b *Builder) pushArg(arg ...any) {
	b.args = append(b.args, arg...)
}

// Where returns a new `WhereBuilder`.
func (b *Builder) Where() *WhereBuilder {
	return b.where
}

// BindMarker allows a `MarkerBuilder` to understand which bind parameter
// syntax should be used
type BindMarker int

const (
	NumberPositional BindMarker = iota
	QuestionPositional
)

// NewMarkerBuilder returns a new `MarkerBuilder`.
func NewMarkerBuilder(marker BindMarker) *MarkerBuilder {
	return &MarkerBuilder{
		count:  1,
		marker: marker,
	}
}

// MarkerBuilder is used to place a bind marker in an SQL query.
// See the `String` method for details.
type MarkerBuilder struct {
	count  int
	marker BindMarker
}

// Reset will reset the `MarkerBuilder` to the state returned by `NewMarkerBuilder`.
func (m *MarkerBuilder) Reset() {
	m.count = 1
}

// String implements `Stringer` for `MarkerBuilder`.
//
// Has different behavior depending on the `BindMarker` used to create the `MarkerBuilder`.
//
// - NumberPositional
//
// Places numbered positional markers. ($1)
//
// - QuestionPositional
//
// Places question mark positional markers. (?)
func (m *MarkerBuilder) String() string {
	var stamp string
	switch m.marker {
	case NumberPositional:
		stamp = fmt.Sprintf("$%v", m.count)
		m.count++
	case QuestionPositional:
		stamp = "?"
	default:
		panic("unsupported marker")
	}
	return stamp
}

// Inject will apply an `Injectable` to the `Builder`.
func (b *Builder) Inject(i Injectable) {
	i.Inject(b)
}
