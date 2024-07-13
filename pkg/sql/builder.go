// Package sql implements a simple query builder.
package sql

import (
	"fmt"
	"strings"
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
func NewBuilder(marker BindMarker) *Builder {
	return &Builder{
		query:  strings.Builder{},
		args:   []any{},
		marker: NewMarkerBuilder(marker),
	}
}

// Builder maintains an internal buffer of text and a series of arguments.
// Helpful for building SQL queries.
type Builder struct {
	query  strings.Builder
	args   []any
	marker *MarkerBuilder
}

// Inject will apply an `Injectable` to the `Builder`.
func (b *Builder) Inject(i Injectable) {
	i.Inject(b)
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
	b.spreadOpaque(opaque...)
}

// SpreadInt will spread any number of int arguments into a comma separated list
// using bind markers.
func (b *Builder) SpreadInt(values ...int) {
	opaque := make([]any, len(values))
	for i, v := range values {
		opaque[i] = v
	}
	b.spreadOpaque(opaque...)
}

func (b *Builder) spreadOpaque(values ...any) {
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
	return &WhereBuilder{
		state: Where,
	}
}

// BindMarker allows a `MarkerBuilder` to understand which bind parameter
// syntax should be used
type BindMarker int

const (
	Numbered BindMarker = iota
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

// String implements `Stringer` for `MarkerBuilder`.
//
// Has different behavior depending on the `BindMarker` used to create the `MarkerBuilder`.
//
// - Numbered
//
// Places numbered markers. ($1)
func (m *MarkerBuilder) String() string {
	var stamp string
	switch m.marker {
	case Numbered:
		stamp = fmt.Sprintf("$%v", m.count)
		m.count++
	default:
		panic("unsupported marker")
	}
	return stamp
}
