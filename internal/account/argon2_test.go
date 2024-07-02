package account

import (
	"bytes"
	"github.com/jmkng/zenin/internal/debug"
	"testing"
)

func TestArgon2(t *testing.T) {
	raw := []byte("plaintext")
	argon2 := Argon2Scheme{DefaultArgon2Params}
	hashed, err := argon2.Hash(raw, []byte{})
	err = argon2.Validate(raw, &hashed)
	debug.AssertNil(t, err)

	if bytes.Equal(hashed.Hash, raw) {
		t.Errorf("values should not be equal: %v != %v", hashed.Hash, raw)
	}
}
