package account

import (
	"crypto/subtle"
	"encoding/base64"
	"fmt"

	"golang.org/x/crypto/argon2"
)

const Argon2SchemeId int = 1

// Argon2Scheme is a password hashing scheme implemented with Argon2(id).
type Argon2Scheme struct {
	Argon2Params
}

// DefaultArgon2Params is the default `Argon2Params` used to hash passwords.
var DefaultArgon2Params = Argon2Params{
	Time:      2,
	Memory:    64 * 1024,
	Threads:   4,
	KeyLength: 32,
}

// Argon2Params describes a strategy for hashing passwords in `Argon2Scheme`.
type Argon2Params struct {
	Time      uint32
	Memory    uint32
	Threads   uint8
	KeyLength uint32
}

// Hash implements `Scheme.Hash` for `Argon2Scheme`.
func (a Argon2Scheme) Hash(hashable []byte, salt []byte) (VersionedSaltedHash, error) {
	if len(salt) < ZeninAccSaltLength {
		// This is a panic because the program will check for a salt of a valid length upon startup,
		// or generate an adequate one itself.
		panic("salt length below minimum threshold")
	}

	hash := argon2.IDKey([]byte(hashable), salt, a.Time, a.Memory, a.Threads, a.KeyLength)
	vsh := NewVersionedSaltedHash(Argon2SchemeId, salt, hash)
	return vsh, nil
}

// Validate implements `Scheme.Validate` for `Argon2Scheme`.
func (a Argon2Scheme) Validate(raw []byte, existing VersionedSaltedHash) error {
	encoding := base64.StdEncoding
	size := base64.Encoding.Strict(*encoding).DecodedLen(len(existing.Salt))
	buffer := make([]byte, size)
	length, err := encoding.Decode(buffer, []byte(existing.Salt))
	if err != nil {
		return fmt.Errorf("failed to decode existing salt: %w", err)
	}
	salt := buffer[:length]

	incoming, err := a.Hash(raw, salt)
	if err != nil {
		return FailedValidateError
	}
	if subtle.ConstantTimeCompare([]byte(incoming.Hash), []byte(existing.Hash)) == 0 {
		return DidNotMatchError
	}
	return nil
}
