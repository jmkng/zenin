package account

import (
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

// Account is the account domain type.
type Account struct {
	Id                  *int                `json:"id" db:"account_id"`
	CreatedAt           internal.TimeValue  `json:"createdAt" db:"created_at"`
	UpdatedAt           internal.TimeValue  `json:"updatedAt" db:"updated_at"`
	Username            string              `json:"username" db:"username"`
	VersionedSaltedHash VersionedSaltedHash `json:"-" db:"versioned_salted_hash"`
	Root                bool                `json:"root" db:"root"`
}

type AccountClaims struct {
	Username string `json:"username"`
	Root     bool   `json:"root"`
	jwt.RegisteredClaims
}

// Token returns a base64 encoded JWT from the `Account`.
func (a Account) Token() (string, error) {
	time := time.Now()

	claims := AccountClaims{
		Username: a.Username,
		Root:     a.Root,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(*a.Id),
			ExpiresAt: jwt.NewNumericDate(time.AddDate(0, 0, 7)),
			IssuedAt:  jwt.NewNumericDate(time),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(env.Env.SignSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return token, err
}

// CreateApplication represents an attempt to create a new `Account`.
type CreateApplication struct {
	Username          string `json:"username"`
	PasswordPlainText string `json:"password"`
	Root              bool   `json:"-"`
}

// Validate will validate the [CreateApplication], returning a [env.Validation] if errors are found.
func (c CreateApplication) Validate() error {
	validation := env.NewValidation()

	var missing []string
	if c.Username == "" {
		missing = append(missing, "username")
	}
	if c.PasswordPlainText == "" {
		missing = append(missing, "password")
	} else {
		if !isValidAccountPassword(c.PasswordPlainText) {
			validation.Join(invalidPasswordError)
		}
	}
	if len(missing) > 0 {
		validation.Push(fmt.Sprintf("Missing required fields: %s.", strings.Join(missing, ", ")))
	}

	if !validation.Empty() {
		return validation
	}
	return nil
}

type UpdateApplication struct {
	Username          string  `json:"username"`
	PasswordPlainText *string `json:"password"`
}

// Validate will validate the [UpdateApplication], returning a [env.Validation] if errors are found.
func (u UpdateApplication) Validate() error {
	validation := env.NewValidation()
	var missing []string

	if u.Username == "" {
		missing = append(missing, "username")
	}
	if u.PasswordPlainText != nil && !isValidAccountPassword(*u.PasswordPlainText) {
		validation.Join(invalidPasswordError)
	}
	if len(missing) > 0 {
		validation.Push(fmt.Sprintf("Missing required fields: %s.", strings.Join(missing, ", ")))
	}

	if !validation.Empty() {
		return validation
	}
	return nil
}

func isValidAccountPassword(p string) bool {
	lenCheck := len(p) < ZeninAccPasswordMin || len(p) > ZeninAccPasswordMax
	hasLower := false
	hasUpper := false
	for _, c := range p {
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
		return false
	}
	return true
}

var invalidPasswordError env.Validation = env.NewValidation("Password must be between 8-100 characters, including upper and lowercase letters and at least one number.")

var usernameRequiredError env.Validation = env.NewValidation("Username is required.")
