package debug

import (
	"reflect"
	"strings"
	"testing"
)

func Assert(t *testing.T, cond bool, message ...string) {
	if len(message) == 0 {
		message = append(message, "condition is false")
	}
	if !cond {
		t.Errorf(strings.Join(message, " "))
	}
}

func AssertEqual[T comparable](t *testing.T, a, b T) {
	t.Helper()
	if a != b {
		t.Errorf("values are not equal: %v != %v", a, b)
	}
}

func AssertDeepEqual(t *testing.T, a, b any) {
	t.Helper()
	if !reflect.DeepEqual(a, b) {
		t.Errorf("values are not equal: %v != %v", a, b)
	}
}
