package debug

import (
	"reflect"
	"testing"
)

func AssertNil(t *testing.T, value any) {
	if value != nil {
		t.Errorf("value is not nil: %v", value)
	}
}

func AssertDeepEqual(t *testing.T, a, b any) {
	if !reflect.DeepEqual(a, b) {
		t.Errorf("hashed values are not the same: (%v) != (%v)", a, b)
	}
}
