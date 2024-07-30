package monitor

import (
	"context"
)

// NewMonitorService returns a new `MonitorService`.
func NewMonitorService(repository MonitorRepository, distributor chan<- any) MonitorService {
	return MonitorService{
		Repository:  repository,
		Distributor: distributor,
	}
}

// MonitorService is a service used to interact with the monitor domain type.
type MonitorService struct {
	Distributor chan<- any
	Repository  MonitorRepository
}

func (s MonitorService) GetActive(ctx context.Context) ([]Monitor, error) {
	active := true
	params := SelectMonitorParams{
		Id:     nil,
		Active: &active,
		Kind:   nil,
	}

	resume, err := s.Repository.SelectMonitor(ctx, 0, &params)
	return resume, err
}

func (s MonitorService) UpdateMonitor(ctx context.Context, monitor Monitor) error {
	if err := s.Repository.UpdateMonitor(ctx, monitor); err != nil {
		return err
	}

	s.Distributor <- StopMessage{
		Id: *monitor.Id,
	}
	if monitor.Active {
		s.Distributor <- StartMessage{
			Monitor: monitor,
		}
	}

	return nil
}
