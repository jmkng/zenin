package monitor

import (
	"context"
)

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

func (s MonitorService) GetActive(ctx context.Context) ([]MonitorJSON, error) {
	active := true
	params := SelectParams{
		Id:     nil,
		Active: &active,
		Kind:   nil,
	}
	resume, err := s.Repository.SelectMonitor(ctx, &params, 0)
	return resume, err
}

func (s MonitorService) StartMonitor(monitor Monitor) {
	s.distributor <- StartMessage{
		Monitor: monitor,
	}
}
