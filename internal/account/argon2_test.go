package account

import (
	"bytes"
	"reflect"
	"testing"
)

func TestArgon2(t *testing.T) {
	raw := []byte("plaintext")
	argon2 := Argon2Scheme{DefaultArgon2Params}
	hashed, err := argon2.Hash(raw, []byte{})
	err = argon2.Validate(raw, &hashed)
	assertNil(t, err)
	if bytes.Equal(hashed.Hash, raw) {
		t.Errorf("values should not be equal: %v != %v", hashed.Hash, raw)
	}
}

func TestScanMarkerIndexes(t *testing.T) {
	expect := func(t *testing.T, value string, a, b, c int) {
		expected := markers{
			Zero: a,
			One:  b,
			Two:  c,
		}
		markers, err := scanMarkerIndexes(value)
		assertNil(t, err)
		assertDeepEqual(t, markers, expected)
	}

	expect(t, ":1:TUejOZDTcm0ooK08Ac81TA:###", 0, 2, 25)
	expect(t, ":102:TUejOZDTcm0ooK08Ac81TA:!!!", 0, 4, 27)
	expect(t, "::TUejOZDTcm0ooK08Ac81TA:@@@", 0, 1, 24)
}

func TestExtractMarkerValues(t *testing.T) {
	raw := ":102:TUejOZDTcm0ooK08Ac81TA:!!!"
	expected := VersionedSaltedHash{
		SchemeID: 102,
		Salt:     []byte("TUejOZDTcm0ooK08Ac81TA"),
		Hash:     []byte("!!!"),
	}

	markers, err := scanMarkerIndexes(raw)
	assertNil(t, err)
	hashed, err := extractMarkerValues(markers, raw)
	assertNil(t, err)
	assertDeepEqual(t, hashed, expected)
}

func assertNil(t *testing.T, value any) {
	if value != nil {
		t.Errorf("value is not nil: %v", value)
	}
}

func assertDeepEqual(t *testing.T, a, b any) {
	if !reflect.DeepEqual(a, b) {
		t.Errorf("hashed values are not the same: (%v) != (%v)", a, b)
	}
}
