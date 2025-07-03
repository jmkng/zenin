package sql

import (
	"fmt"
	"strings"
)

// NewBuilder returns a new [Builder].
func NewBuilder(marker Marker) *Builder {
	return &Builder{
		query:  strings.Builder{},
		args:   []any{},
		marker: NewMarkerBuilder(marker),
	}
}

// Builder maintains an internal buffer of text and a series of arguments.
type Builder struct {
	query  strings.Builder
	args   []any
	marker *MarkerBuilder
}

// separated returns true when either the end of the internal buffer
// or beginning of the value is whitespace.
func (b *Builder) separated(value string) bool {
	if value == "" || b.query.Len() == 0 {
		return true
	}
	last := b.query.String()
	return strings.HasSuffix(last, " ") || strings.HasPrefix(value, " ")
}

// Advance will advance the internal [MarkerBuilder] count by the provided value.
// Useful when building a query that combines hardcoded and dynamically appended bind markers.
//
// Using this does not make sense when the builder is not using numbered markers,
// so it will panic as a sanity check in that case.
func (b *Builder) Advance(value int) {
	if b.marker.m != MarkerNumber {
		panic("sql/Builder: no-op advance called")
	}
	b.marker.count += value
}

// String returns the internal buffer as a string.
func (b *Builder) String() string {
	return b.query.String()
}

// Return the arguments within the [Builder].
func (b Builder) Args() []any {
	return b.args
}

// Push adds a new string to the internal buffer.
// Padding is added before the value, if needed.
func (b *Builder) Push(value string) {
	if !b.separated(value) {
		b.query.WriteByte(' ')
	}
	b.query.WriteString(value)
}

// PushArg adds an argument to the argument stack.
func (b *Builder) PushArg(value any) {
	b.args = append(b.args, value)
}

// Bind will push a bind marker to the internal buffer and add arg to the argument stack.
// Padding is added before the marker, if needed.
func (b *Builder) Bind(value any) {
	b.Push(b.marker.String())
	b.args = append(b.args, value)
}

// Spread will spread any number of arguments into a comma separated list.
func (b *Builder) Spread(values ...any) {
	for i, v := range values {
		if i > 0 {
			b.query.WriteByte(',')
		}
		_, _ = fmt.Fprintf(&b.query, "%v", v)
	}
}

// Spread is the generic version of [Builder.Spread].
func Spread[T any](b *Builder, values ...T) {
	for i, v := range values {
		if i > 0 {
			b.query.WriteByte(',')
		}
		_, _ = fmt.Fprintf(&b.query, "%v", v)
	}
}

// SpreadBind is the same as [Spread], but uses bind arguments.
func (b *Builder) SpreadBind(values ...any) {
	b.args = append(b.args, values...)
	for i := range values {
		if i > 0 {
			b.query.WriteByte(',')
		}
		_, _ = fmt.Fprintf(&b.query, "%v", b.marker)
	}
}

// SpreadBind is the generic version of [Builder.SpreadBind].
func SpreadBind[T any](b *Builder, values ...T) {
	for i, v := range values {
		b.args = append(b.args, v)
		if i > 0 {
			b.query.WriteByte(',')
		}
		_, _ = fmt.Fprintf(&b.query, "%v", b.marker)
	}
}

// Parenthesize is the same as [Builder.Spread], but places the values inside parentheses.
// Padding is added before the opening parenthesis, if needed.
func (b *Builder) Parenthesize(values ...any) {
	b.Push("(")
	b.Spread(values...)
	b.query.WriteByte(')')
}

// Parenthesize is the generic version of [Builder.Parenthesize].
func Parenthesize[T any](b *Builder, values ...T) {
	b.Push("(")
	Spread(b, values...)
	b.query.WriteByte(')')
}

// ParenthesizeBind is the same as [Builder.Parenthesize], but uses bind arguments.
func (b *Builder) ParenthesizeBind(values ...any) {
	b.Push("(")
	b.SpreadBind(values...)
	b.query.WriteByte(')')
}

// ParenthesizeBind is the generic version of [Builder.ParenthesizeBind].
func ParenthesizeBind[T any](b *Builder, values ...T) {
	b.Push("(")
	SpreadBind(b, values...)
	b.query.WriteByte(')')
}

// Where returns a new [Where] associated with b.
func (b *Builder) Where() *Where {
	return &Where{b: b}
}

type Marker int

const (
	MarkerInvalid Marker = iota
	MarkerNumber
	MarkerQuestion
)

// NewMarkerBuilder returns a new MarkerBuilder.
func NewMarkerBuilder(marker Marker) *MarkerBuilder {
	return &MarkerBuilder{
		count: 1,
		m:     marker,
	}
}

// MarkerBuilder is used to place a bind marker in an SQL query.
// See the String method for details.
type MarkerBuilder struct {
	count int
	m     Marker
}

// String returns a positional based on the value of the internal [Marker].
//
//   - NumberPositional
//
//     Places numbered positional markers. ($1)
//
//   - QuestionPositional
//
//     Places question mark positional markers. (?)
func (m *MarkerBuilder) String() string {
	var stamp string
	switch m.m {
	case MarkerNumber:
		stamp = fmt.Sprintf("$%d", m.count)
		m.count++
	case MarkerQuestion:
		stamp = "?"
	default:
		panic("unknown marker")
	}
	return stamp
}

type Clause int

const (
	ClauseWhere Clause = iota
	ClauseAnd
)

// Where is used to push "WHERE" or "AND" clauses.
// See [Where.String] for details.
type Where struct {
	c Clause
	b *Builder
}

// String returns "WHERE" a single time, and then "AND" every time after that.
func (w *Where) String() string {
	if w.c == ClauseWhere {
		w.c = ClauseAnd
		return "WHERE"
	}
	return "AND"
}

type Op int

const (
	OpLess Op = iota
	OpLessEqual
	OpGreater
	OpGreaterEqual
	OpEqual
)

func (o Op) String() string {
	var x string
	switch o {
	case OpLess:
		x = "<"
	case OpLessEqual:
		x = "<="
	case OpGreater:
		x = ">"
	case OpGreaterEqual:
		x = ">="
	case OpEqual:
		x = "="
	default:
		panic("invalid operator kind")
	}
	return x
}

// In will spread any number of arguments into a "WHERE (column) IN (values...)" clause.
func (w *Where) In(column string, values ...any) {
	w.b.Push(fmt.Sprintf("%s %s IN", w, column))
	w.b.Parenthesize(values...)
}

// In is the generic version of [Where.In].
func In[T any](w *Where, column string, values ...T) {
	w.b.Push(fmt.Sprintf("%s %s IN", w, column))
	Parenthesize(w.b, values...)
}

// InBind is the same as [Where.In], but uses bind arguments.
func (w *Where) InBind(column string, values ...any) {
	w.b.Push(fmt.Sprintf("%s %s IN", w, column))
	w.b.ParenthesizeBind(values...)
}

// InBind is the generic version of [Where.InBind].
func InBind[T any](w *Where, column string, values ...T) {
	w.b.Push(fmt.Sprintf("%s %s IN", w, column))
	ParenthesizeBind(w.b, values...)
}

// Expr generates a "WHERE (column) (o) (value)" clause.
func (w *Where) Expr(column string, o Op, value any) {
	w.b.Push(fmt.Sprintf("%s %s %s %v", w, column, o, value))
}

// ExprBind is the same as [Where.Expr], but uses bind arguments.
func (w *Where) ExprBind(column string, o Op, value any) {
	w.b.Push(fmt.Sprintf("%s %s %s", w, column, o))
	w.b.Bind(value)
}
