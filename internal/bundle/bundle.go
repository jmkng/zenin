package bundle

import (
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/meta"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/repository"
)

// NewBundle will return a Bundle with new services.
func NewBundle(repository repository.Repository) Bundle {
	meta := meta.NewMetaService(repository)
	measurement := measurement.NewMeasurementService(repository)
	distributor := monitor.NewDistributor(measurement)
	sender := distributor.Listen()
	monitor := monitor.NewMonitorService(repository, sender)
	account := account.NewAccountService(repository)
	return Bundle{Meta: meta, Measurement: measurement, Monitor: monitor, Account: account}
}

// Bundle is a container for service types,
// which are stateless (or simple to copy) containers for domain logic.
type Bundle struct {
	Meta        meta.MetaService
	Measurement measurement.MeasurementService
	Monitor     monitor.MonitorService
	Account     account.AccountService
}
