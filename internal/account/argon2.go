package account

import (
	"crypto/subtle"
	"errors"

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
	var err error
	if len(salt) == 0 {
		salt, err = getRandomBytes(ZeninAccSaltLength)
	}
	if err != nil {
		return VersionedSaltedHash{}, err
	}

	hash := argon2.IDKey([]byte(hashable), salt, a.Time, a.Memory, a.Threads, a.KeyLength)
	return VersionedSaltedHash{
		SchemeId: Argon2SchemeId,
		Salt:     salt,
		Hash:     hash,
	}, nil
}

// FailedValidateError is an error returned when the password validation process fails.
var FailedValidateError = errors.New("failed to perform validation")

// DidNotMatchError is an error returned when a password validation is performed,
// but the values do not match.
var DidNotMatchError = errors.New("values did not match")

// Validate implements `Scheme.Validate` for `Argon2Scheme`.
//
// # Errors:
//
//   - FailedValidateError
//
//     Returned when the password validation process fails.
//
//   - DidNotMatchError
//
//     Returned when the password validation was performed, but the values do not match.
func (a Argon2Scheme) Validate(raw []byte, existing *VersionedSaltedHash) error {
	incoming, err := a.Hash(raw, existing.Salt)
	if err != nil {
		return FailedValidateError
	}
	if subtle.ConstantTimeCompare([]byte(incoming.Hash), []byte(existing.Hash)) == 0 {
		return DidNotMatchError
	}
	return nil
}
