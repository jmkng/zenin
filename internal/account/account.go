package account

import (
	"fmt"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmkng/zenin/internal/env"
)

// Account is the account domain type.
type Account struct {
	Id                  *int                `json:"id" db:"account_id"`
	CreatedAt           time.Time           `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time           `json:"updatedAt" db:"updated_at"`
	Username            string              `json:"username" db:"username"`
	VersionedSaltedHash VersionedSaltedHash `json:"-" db:"versioned_salted_hash"`
	Root                bool                `json:"root" db:"root"`
}

type AccountClaims struct {
	Root bool `json:"root"`
	jwt.RegisteredClaims
}

// Token returns a base64 encoded JWT from the `Account`.
func (a Account) Token() (string, error) {
	now := time.Now()

	claims := AccountClaims{
		Root: a.Root,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   a.Username,
			ExpiresAt: jwt.NewNumericDate(now.AddDate(0, 0, 7)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(env.Runtime.SignSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return token, err
}

// Application represents an attempt to create a new `Account`.
type Application struct {
	Username          string `json:"username"`
	PasswordPlainText string `json:"password"`
	Root              bool   `json:"-"`
}

// Validate will return an error if the `Application` is in an invalid state.
func (a Application) Validate() error {
	len := len(a.PasswordPlainText)
	if a.Username == "" {
		return env.NewValidation("Username is required.")
	}
	lenCheck := len < ZeninAccPasswordMin || len > ZeninAccPasswordMax
	hasLower := false
	hasUpper := false
	for _, c := range a.PasswordPlainText {
		if unicode.IsLower(c) {
			hasLower = true
		}
		if unicode.IsUpper(c) {
			hasUpper = true
		}
		if hasLower && hasUpper {
			break
		}
	}
	caseCheck := !hasLower || !hasUpper
	if lenCheck || caseCheck {
		return env.NewValidation("Password must be between 8-100 characters, including upper and lowercase letters and at least one number.")
	}
	return nil
}
