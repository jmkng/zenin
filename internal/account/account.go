package account

import (
	"fmt"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

// Account is the account domain type.
type Account struct {
	Id                  *int                `db:"id"`
	CreatedAt           time.Time           `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time           `json:"updatedAt" db:"updated_at"`
	Username            string              `db:"username"`
	VersionedSaltedHash VersionedSaltedHash `db:"versioned_salted_hash"`
}

// Token returns a base64 encoded JWT from the `Account`.
func (a Account) Token() (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   a.Username,
		ExpiresAt: jwt.NewNumericDate(now.AddDate(0, 0, 7)),
		IssuedAt:  jwt.NewNumericDate(now),
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
}

// Validate will return an error if the `Application` is in an invalid state.
func (a Application) Validate() error {
	len := len(a.PasswordPlainText)
	if a.Username == "" {
		return internal.NewValidation("Username is required.")
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
		return internal.NewValidation("Password must be between 8-100 characters, including upper and lowercase letters and at least one number.")
	}
	return nil
}
