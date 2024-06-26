package repository

import (
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

const MigrationMarker string = "--#"

// SchemaTables is a list of the tables expected to be found within a Zenin database.
var SchemaTables = []string{"account", "monitor", "measurement", "certificate"}

type Repository interface {
	// Validate will return true if the database schema is valid,
	// and may return an error if the repository cannot be validated.
	Validate() (bool, error)
	// Migrate will attempt to migrate the database.
	Migrate() error

	monitor.MonitorRepository
	measurement.MeasurementRepository
	account.AccountRepository
}
