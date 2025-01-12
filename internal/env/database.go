package env

import (
	"os"
	"strconv"
	"strings"
)

type DatabaseKind string

const (
	Postgres DatabaseKind = "postgres"
)

// Database is an instance of `DatabaseEnv` initialized at startup.
var Database *DatabaseEnv = NewDatabaseEnv()

func NewDatabaseEnv() *DatabaseEnv {
	var kind DatabaseKind
	switch key := strings.ToLower(os.Getenv(dbKindKey)); key {
	case "postgres":
		kind = Postgres
	}
	username := os.Getenv(dbUsernameKey)
	password := os.Getenv(dbPasswordKey)
	host := os.Getenv(dbAddressKey)
	port := os.Getenv(dbPortKey)
	name := os.Getenv(dbNameKey)
	var maxConn uint16
	envMaxConn, err := strconv.ParseUint(os.Getenv(rtPortKey), 10, 16)
	if err == nil {
		maxConn = uint16(envMaxConn)
	}

	return &DatabaseEnv{
		Kind:     kind,
		Username: username,
		Password: password,
		Host:     host,
		Port:     port,
		Name:     name,
		MaxConn:  maxConn,
	}
}

type DatabaseEnv struct {
	Kind     DatabaseKind
	Username string
	Password string
	Host     string
	Port     string
	Name     string
	MaxConn  uint16
}

const (
	dbKindKey     = "ZENIN_DB_KIND"
	dbUsernameKey = "ZENIN_DB_USERNAME"
	dbPasswordKey = "ZENIN_DB_PASSWORD"
	dbAddressKey  = "ZENIN_DB_ADDRESS"
	dbPortKey     = "ZENIN_DB_PORT"
	dbNameKey     = "ZENIN_DB_NAME"
	dbMaxKey      = "ZENIN_DB_MAX_CONN"
)
