package repository

import (
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/settings"
)

// SchemaTables is a list of the tables expected to be found within a Zenin repository.
var SchemaTables = []string{
	"account",
	"monitor",
	"measurement",
	"certificate",
	"settings",
	"event",
}

type Repository interface {
	// Validate returns true if the repository schema is valid.
	Validate() (bool, error)
	// Migrate will attempt to migrate the repository.
	Migrate() error
	// Fixture converts the repository into a test fixture by resetting the schema,
	// applying migrations, and inserting seed data.
	Fixture() error
	// Describe returns a description as key/value pairs.
	Describe() []any

	monitor.MonitorRepository
	measurement.MeasurementRepository
	account.AccountRepository
	settings.SettingsRepository
}
