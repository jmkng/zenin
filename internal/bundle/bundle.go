package bundle

import (
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/repository"
)

// NewBundle will return a Bundle with new services.
func NewBundle(repository repository.Repository) Bundle {
	// A `MeasurementService` is needed to create the `Distributor`, so do that first.
	measurement := measurement.NewMeasurementService(repository)

	// Build the `Distributor` and begin listening.
	distributor := monitor.NewDistributor(measurement)
	sender := distributor.Listen()

	// Construct remaining services and return.
	monitor := monitor.NewMonitorService(repository, sender)
	account := account.NewAccountService(repository)
	return Bundle{Measurement: measurement, Monitor: monitor, Account: account}
}

// Bundle is a container for service types,
// which are stateless (or simple to copy) containers for domain logic.
type Bundle struct {
	Measurement measurement.MeasurementService
	Monitor     monitor.MonitorService
	Account     account.AccountService
}
