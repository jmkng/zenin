package account

import (
	"time"
)

// Account represents the account domain type.
type Account struct {
	Id int
	Registration
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

// Registration is a username, and a `Hashed`, representing a hashed password.
//
// It may be inserted into the account domain database table to receive an ID,
// at which point it can be promoted to an `Account` using the `Account` method.
type Registration struct {
	Username            string
	VersionedSaltedHash VersionedSaltedHash
}

// Return an `Account` from the `Registration`.
func (r Registration) Account(id int) Account {
	return Account{Id: id, Registration: r}
}
