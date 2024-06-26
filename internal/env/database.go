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
	host := os.Getenv(dbHostKey)
	port := os.Getenv(dbPortKey)
	name := os.Getenv(dbNameKey)
	var maxCon uint16
	envMaxcon, err := strconv.ParseUint(os.Getenv(rtPortKey), 10, 16)
	if err == nil {
		maxCon = uint16(envMaxcon)
	}

	return &DatabaseEnv{
		Kind:     kind,
		Username: username,
		Password: password,
		Host:     host,
		Port:     port,
		Name:     name,
		MaxCon:   maxCon,
	}
}

type DatabaseEnv struct {
	Kind     DatabaseKind
	Username string
	Password string
	Host     string
	Port     string
	Name     string
	MaxCon   uint16
}

const (
	dbKindKey     = "ZENIN_DB_KIND"
	dbUsernameKey = "ZENIN_DB_USERNAME"
	dbPasswordKey = "ZENIN_DB_PASSWORD"
	dbHostKey     = "ZENIN_DB_HOST"
	dbPortKey     = "ZENIN_DB_PORT"
	dbNameKey     = "ZENIN_DB_NAME"
	dbMaxKey      = "ZENIN_DB_MAX_CON"
)
