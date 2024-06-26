package builder

import (
	"testing"
)

func TestBuilder(t *testing.T) {
	builder := New()
	builder.Push("SELECT * FROM people")
	builder.Where()
	builder.Push("age > 25")
	builder.Where()
	builder.Push("name <> 'Adamson'")

	query := builder.Get()
	if query != "SELECT * FROM people WHERE age > 25 AND name <> 'Adamson'" {
		t.Errorf("unexpected query: %v", query)
	}
}
