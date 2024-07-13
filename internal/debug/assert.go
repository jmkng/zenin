package debug

import (
	"reflect"
	"testing"
)

func AssertNil(t *testing.T, value any) {
	t.Helper()
	if value != nil {
		t.Errorf("value is not nil: %v", value)
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
