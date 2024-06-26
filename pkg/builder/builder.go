package builder

import "fmt"

func New() *Builder {
	return &Builder{
		query: "",
		where: "WHERE",
	}
}

type Builder struct {
	// The internal query string.
	query string
	// The current "WHERE" seperator
	where string
}

// Get returns the query.
func (b *Builder) Get() string { return b.query }

// Push adds a string to the query.
func (b *Builder) Push(q string) { b.query += q }

// Where adds a WHERE clause to the query.
func (b *Builder) Where() {
	b.query += fmt.Sprintf(" %v ", b.where)
	b.where = "AND"
}
