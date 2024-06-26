package monitor

// NewMonitorService returns a new `MonitorService`.
func NewMonitorService(repository MonitorRepository, distributor chan<- any) MonitorService {
	return MonitorService{
		Repository:  repository,
		distributor: distributor,
	}
}

// MonitorService is a service used to interact with the monitor domain type.
type MonitorService struct {
	distributor chan<- any
	Repository  MonitorRepository
}
