package account

import (
	"testing"

	"github.com/jmkng/zenin/internal/debug"
)

func TestScanMarkerIndexes(t *testing.T) {
	expect := func(t *testing.T, value string, a, b, c int) {
		expected := markers{
			Zero: a,
			One:  b,
			Two:  c,
		}
		markers := scanMarkerIndexes(value)
		debug.AssertDeepEqual(t, markers, expected)
	}

	expect(t, ":1:TUejOZDTcm0ooK08Ac81TA:###", 0, 2, 25)
	expect(t, ":102:TUejOZDTcm0ooK08Ac81TA:!!!", 0, 4, 27)
	expect(t, "::TUejOZDTcm0ooK08Ac81TA:@@@", 0, 1, 24)
}

func TestExtractMarkerValues(t *testing.T) {
	raw := ":102:TUejOZDTcm0ooK08Ac81TA:!!!"
	expected := VersionedSaltedHash{
		SchemeId: 102,
		Salt:     "TUejOZDTcm0ooK08Ac81TA",
		Hash:     "!!!",
	}

	markers := scanMarkerIndexes(raw)
	hashed := extractMarkerValues(markers, raw)
	debug.AssertDeepEqual(t, hashed, expected)
}
