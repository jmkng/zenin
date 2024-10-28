package repository

import (
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// SchemaTables is a list of the tables expected to be found within a Zenin repository.
var SchemaTables = []string{"account", "monitor", "measurement", "certificate"}

type Repository interface {
	// Validate returns true if the repository schema is valid.
	Validate() (bool, error)
	// Migrate will attempt to migrate the repository.
	Migrate() error

	monitor.MonitorRepository
	measurement.MeasurementRepository
	account.AccountRepository
}
