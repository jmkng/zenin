package sql

import (
	"testing"
)

func TestBuilderPush(t *testing.T) {
	b := NewBuilder(MarkerQuestion)
	b.Push("SELECT")
	b.Push("*")
	b.Push("FROM users")

	got := b.String()
	want := "SELECT * FROM users"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}
}

func TestBuilderBind(t *testing.T) {
	b := NewBuilder(MarkerNumber)
	b.Push("WHERE age >")
	b.Bind(30)

	got := b.String()
	want := "WHERE age > $1"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}

	a := b.Args()
	if len(a) != 1 || a[0] != 30 {
		t.Errorf("unexpected args: %v", a)
	}
}

func TestBuilderSpread(t *testing.T) {
	want := "1,2,3"

	t.Run("method variadic spread", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		b.Spread(1, 2, 3)
		got := b.String()
		if got != want {
			t.Errorf("unexpected query string: got: %q want: %q", got, want)
		}
	})

	t.Run("generic function slice spread", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		id := []int{1, 2, 3}
		Spread(b, id...)
		got := b.String()
		if got != want {
			t.Errorf("unexpected query string: got: %q want: %q", got, want)
		}
	})

	t.Run("generic function variadic spread", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		Spread(b, 1, 2, 3)
		got := b.String()
		if got != want {
			t.Errorf("unexpected query string: got: %q want: %q", got, want)
		}
	})
}

func TestBuilderSpreadBind(t *testing.T) {
	wantQuery := "?,?,?"

	t.Run("method variadic spreadbind", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		b.SpreadBind("a", "b", "c")

		got := b.String()
		if got != wantQuery {
			t.Errorf("unexpected query string: got: %q want: %q", got, wantQuery)
		}

		gotArgs := b.Args()
		if len(gotArgs) != 3 || gotArgs[0] != "a" || gotArgs[1] != "b" || gotArgs[2] != "c" {
			t.Errorf("unexpected args: %v", gotArgs)
		}
	})

	t.Run("generic function slice spreadbind", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		args := []string{"a", "b", "c"}
		SpreadBind(b, args...)

		got := b.String()
		if got != wantQuery {
			t.Errorf("unexpected query string: got: %q want: %q", got, wantQuery)
		}

		gotArgs := b.Args()
		if len(gotArgs) != 3 || gotArgs[0] != "a" || gotArgs[1] != "b" || gotArgs[2] != "c" {
			t.Errorf("unexpected args: %v", gotArgs)
		}
	})

	t.Run("generic function variadic spreadbind", func(t *testing.T) {
		b := NewBuilder(MarkerQuestion)
		SpreadBind(b, "a", "b", "c")

		got := b.String()
		if got != wantQuery {
			t.Errorf("unexpected query string: got: %q want: %q", got, wantQuery)
		}

		gotArgs := b.Args()
		if len(gotArgs) != 3 || gotArgs[0] != "a" || gotArgs[1] != "b" || gotArgs[2] != "c" {
			t.Errorf("unexpected args: %v", gotArgs)
		}
	})
}

func TestBuilderParenthesize(t *testing.T) {
	b := NewBuilder(MarkerQuestion)
	b.Parenthesize("foo", "bar")

	got := b.String()
	want := "(foo,bar)"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}
}

func TestBuilderParenthesizeBind(t *testing.T) {
	b := NewBuilder(MarkerNumber)
	b.ParenthesizeBind(1, 2, 3)

	got := b.String()
	want := "($1,$2,$3)"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}

	a := b.Args()
	if len(a) != 3 || a[0] != 1 || a[1] != 2 || a[2] != 3 {
		t.Errorf("unexpected args: %v", a)
	}
}

func TestWhereString(t *testing.T) {
	b := NewBuilder(MarkerQuestion)
	w := b.Where()

	got := w.String()
	want := "WHERE"
	if got != want {
		t.Errorf("unexpected Where (1): got %q, want %q", got, want)
	}

	got = w.String()
	want = "AND"
	if got != want {
		t.Errorf("unexpected Where (2): got %q, want %q", got, want)
	}

	got = w.String()
	if got != "AND" {
		t.Errorf("unexpected Where (3): got %q, want %q", got, want)
	}
}

func TestWhereExpression(t *testing.T) {
	b := NewBuilder(MarkerQuestion)
	w := b.Where()

	w.Expr("age", OpGreater, 18)

	got := b.String()
	want := "WHERE age > 18"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}
}

func TestWhereExpressionBind(t *testing.T) {
	b := NewBuilder(MarkerNumber)
	w := b.Where()

	w.ExprBind("score", OpGreaterEqual, 90)

	got := b.String()
	want := "WHERE score >= $1"
	if got != want {
		t.Errorf("unexpected query string: got: %q want: %q", got, want)
	}

	a := b.Args()
	if len(a) != 1 || a[0] != 90 {
		t.Errorf("unexpected args: %v", a)
	}
}

func TestAdvanceNumbered(t *testing.T) {
	b := NewBuilder(MarkerNumber)
	b.Advance(3)
	b.Bind("test")

	got := b.String()
	want := "$4"
	if got != want {
		t.Errorf("unexpected query string after advance: got: %q want: %q", got, want)
	}
}

func TestAdvanceInvalidUse(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected panic when calling Advance with MarkerQuestion")
		}
	}()
	b := NewBuilder(MarkerQuestion)
	b.Advance(2)
}
