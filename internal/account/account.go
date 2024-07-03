package account

import (
	"time"
)

// Account is the account domain type.
type Account struct {
	Id                  *int
	Username            string
	VersionedSaltedHash VersionedSaltedHash
}

// Claims returns a new `Claims` from the `Account`.
func (a Account) Claims() Claims {
	now := time.Now().Unix()
	exp := now + int64(7*24*60*60) // One week.
	return Claims{Sub: a.Username, Iat: now, Exp: exp}
}

// Claims contains the JWT token claims.
type Claims struct {
	Sub string `json:"sub"`
	Iat int64  `json:"iat"`
	Exp int64  `json:"exp"`
}
