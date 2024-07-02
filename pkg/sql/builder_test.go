package sql

import (
	"fmt"
	"testing"
)

func TestBuilder(t *testing.T) {
	builder := NewBuilder(Numbered)

	where := builder.Where()
	s := fmt.Sprintf("SELECT * FROM PEOPLE %v AGE > 25 %v name <> 'Adamson'", where, where)
	builder.Push(s)

	expected := "SELECT * FROM PEOPLE WHERE AGE > 25 AND name <> 'Adamson'"
	received := builder.String()
	if received != expected {
		t.Errorf("expected: %v, received: %v", expected, received)
	}
}
