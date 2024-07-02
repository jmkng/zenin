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
	Validate(raw []byte, existing *VersionedSaltedHash) error
}

// GetCurrentScheme returns the current recommended implementation of `Scheme`,
func GetCurrentScheme() Scheme {
	return Argon2Scheme{DefaultArgon2Params}
}

// GetSchemeById returns an implementation of `Scheme` by id.
//
// # Panic
//
// If the id is unrecognized, this function will panic.
// Pass in a constant defined in a package, like `Argon2SchemeId`, etc...
func GetSchemeById(id int) (Scheme, error) {
	var impl Scheme
	switch id {
	case Argon2SchemeId:
		impl = Argon2Scheme{DefaultArgon2Params}
	default:
		return nil, errors.New("unrecognized scheme id")
	}
	return impl, nil
}

// NewHashedFromString will parse a string into a new `VersionedSaltedHash`.
func NewHashedFromString(raw string) (VersionedSaltedHash, error) {
	markers, err := scanMarkerIndexes(raw)
	if err != nil {
		return VersionedSaltedHash{}, err
	}
	hashed, err := extractMarkerValues(markers, raw)
	return hashed, err
}

// VersionedSaltedHash is a hashed password and other related information.
type VersionedSaltedHash struct {
	// A unique scheme identifier, to be compared with the unique identifiers declared
	// in each implementation of Scheme. `Argon2SchemeId`, etc..
	SchemeId int
	// Raw bytes that were used to salt the `Value`.
	Salt []byte
	// Raw bytes representing the hashed password.
	Hash []byte
}

// String implements `Stringer` for `VersionedSaltedHash`.
//
// The `Salt` and `Hash` values will be base64 encoded.
func (h VersionedSaltedHash) String() string {
	m := ZeninAccSchemeMarker
	encodedSalt := base64.
		StdEncoding.
		EncodeToString(h.Salt)
	encodedValue := base64.
		StdEncoding.
		EncodeToString(h.Hash)

	return fmt.Sprintf("%c%d%c%s%c%s", m, h.SchemeId, m, encodedSalt, m, encodedValue)
}

// scanMarkerIndexes will return a set of indexes that mark the beginning of the scheme version,
// salt, and hashed password.
func scanMarkerIndexes(raw string) (markers, error) {
	if len(raw) == 0 || rune(raw[0]) != ZeninAccSchemeMarker {
		return markers{}, fmt.Errorf("value should begin with scheme marker fields")
	}

	var indexes []int
	for i, r := range raw {
		if r == ZeninAccSchemeMarker {
			indexes = append(indexes, i)
		}
	}
	if len(indexes) != 3 {
		return markers{}, fmt.Errorf("expected 3 scheme marker fields")
	}
	return markers{
		Zero: indexes[0],
		One:  indexes[1],
		Two:  indexes[2],
	}, nil
}

// markers is a container for the indexes found by `scanMarkerIndexes`.
type markers struct {
	Zero, One, Two int
}

// extractMarkerValues will return a `Hashed` from the raw string.
func extractMarkerValues(markers markers, raw string) (VersionedSaltedHash, error) {
	schemeId, err := strconv.ParseInt(raw[markers.Zero+1:markers.One], 10, 32)
	if err != nil {
		return VersionedSaltedHash{}, errors.New("failed to extract values from versioned salted hash")
	}

	salt := raw[markers.One+1 : markers.Two]
	value := raw[markers.Two+1:]
	return VersionedSaltedHash{SchemeId: int(schemeId), Salt: []byte(salt), Hash: []byte(value)}, nil
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
