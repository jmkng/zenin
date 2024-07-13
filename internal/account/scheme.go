package account

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
)

const (
	// ZeninAccSaltLength is the minimum byte length of a generated salt.
	ZeninAccSaltLength int = 16
	// ZeninAccSchemeMarker is a character used to separate values in a
	// versioned salted hash string.
	ZeninAccSchemeMarker rune = ':'
	// ZeninAccPasswordMin is the minimum password length.
	ZeninAccPasswordMin int = 8
	// ZeninAccPasswordMax is the maximum password length.
	ZeninAccPasswordMax int = 100
)

// Scheme is a strategy for hashing and validating account passwords.
type Scheme interface {
	// Hash returns a instance of `Hashed` from bytes.
	Hash(hashable []byte, salt []byte) (VersionedSaltedHash, error)
	// Validate will hash bytes and compare them to the provided `VersionedSaltedHash`.
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
	Validate(raw []byte, existing VersionedSaltedHash) error
}

// FailedValidateError is an error returned when the password validation process fails.
var FailedValidateError = errors.New("failed to perform validation")

// DidNotMatchError is an error returned when a password validation is performed,
// but the values do not match.
var DidNotMatchError = errors.New("values did not match")

// GetCurrentScheme returns the current recommended implementation of `Scheme`,
func GetCurrentScheme() Scheme {
	return Argon2Scheme{DefaultArgon2Params}
}

// NewSchemeFromId returns an implementation of `Scheme` by id.
//
// # Panic
//
// This function will panic if you provide an unrecognized scheme id,
// use a constant like `Argon2SchemeId` for safety.
func NewSchemeFromId(id int) Scheme {
	var impl Scheme
	switch id {
	case Argon2SchemeId:
		impl = Argon2Scheme{DefaultArgon2Params}
	default:
		panic("unrecognized scheme id")
	}
	return impl
}

// NewVersionedSaltedHashFromDatabase will parse a string into a new `VersionedSaltedHash`.
//
// # Panic
//
// This function will panic if the provided value is not an expected format,
// so only provide input that is directly from the Zenin database.
func NewVersionedSaltedHashFromDatabase(raw string) VersionedSaltedHash {
	return extractMarkerValues(scanMarkerIndexes(raw), raw)
}

// NewVersionedSaltedHash returns a new `VersionedSaltedHash`
//
// # Warning
//
// You should not use this method to create a `VersionedSaltedHash` using values
// from a Zenin database.
//
// This method provides a shortcut to convert raw salt and hash bytes to base64
// encoded strings, and the values from a database are already base64 encoded.
//
// To quickly create a `VersionedSaltedHash` using values that are already encoded,
// use `NewVersionedSaltedHashFromDatabase`.
func NewVersionedSaltedHash(id int, salt []byte, hash []byte) VersionedSaltedHash {
	//m := ZeninAccSchemeMarker
	encodedSalt := base64.
		StdEncoding.
		EncodeToString(salt)
	encodedHash := base64.
		StdEncoding.
		EncodeToString(hash)
	return VersionedSaltedHash{
		SchemeId: id,
		Salt:     encodedSalt,
		Hash:     encodedHash,
	}
}

// VersionedSaltedHash is a hashed password and other related information.
type VersionedSaltedHash struct {
	// Unique scheme identifier. `Argon2SchemeId`, etc..
	SchemeId int
	// Base64 encoded salt.
	Salt string
	// Base64 encoded hash.
	Hash string
}

// String implements `Stringer` for `VersionedSaltedHash`.
func (v VersionedSaltedHash) String() string {
	m := ZeninAccSchemeMarker
	return fmt.Sprintf("%c%d%c%s%c%s", m, v.SchemeId, m, v.Salt, m, v.Hash)
}

// Scan implements `sql.Scanner` for `VersionedSaltedHash`.
func (vsh *VersionedSaltedHash) Scan(value interface{}) error {
	str, ok := value.(string)
	if !ok {
		panic("expected string input when scanning versioned salted hash")
	}

	indexes := scanMarkerIndexes(str)
	extract := extractMarkerValues(indexes, str)

	vsh.Hash = extract.Hash
	vsh.SchemeId = extract.SchemeId
	vsh.Salt = extract.Salt
	return nil
}

// scanMarkerIndexes will return a set of indexes that mark the beginning of the scheme version,
// salt, and hashed password.
func scanMarkerIndexes(raw string) markers {
	if len(raw) == 0 || rune(raw[0]) != ZeninAccSchemeMarker {
		panic("versioned salted hash should begin with scheme marker")
	}

	var indexes []int
	for i, r := range raw {
		if r == ZeninAccSchemeMarker {
			indexes = append(indexes, i)
		}
	}
	if len(indexes) != 3 {
		panic("expected 3 scheme markers")
	}
	return markers{
		Zero: indexes[0],
		One:  indexes[1],
		Two:  indexes[2],
	}
}

// markers is a container for the indexes found by `scanMarkerIndexes`.
type markers struct {
	Zero, One, Two int
}

// extractMarkerValues will return a `Hashed` from the raw string.
func extractMarkerValues(markers markers, raw string) VersionedSaltedHash {
	schemeId, err := strconv.ParseInt(raw[markers.Zero+1:markers.One], 10, 32)
	if err != nil {
		panic("failed to parse scheme id")
	}

	salt := raw[markers.One+1 : markers.Two]
	value := raw[markers.Two+1:]
	return VersionedSaltedHash{SchemeId: int(schemeId), Salt: salt, Hash: value}
}

// getRandomBytes will generate a cryptographically random byte array with the provided length.
func getRandomBytes(length int) ([]byte, error) {
	salt := make([]byte, length)
	_, err := rand.Read(salt)
	if err != nil {
		return salt, fmt.Errorf("failed to generate byte array: %w", err)
	}
	return salt, nil
}
