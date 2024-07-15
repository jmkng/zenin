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

func (s MonitorService) GetActive(ctx context.Context) ([]Monitor, error) {
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

func (s MonitorService) CheckMonitorExists(ctx context.Context, id int) (bool, error) {
	slice := []int{id}
	params := SelectParams{
		Id:     &slice,
		Active: nil,
		Kind:   nil,
	}

	monitors, err := s.Repository.SelectMonitor(ctx, &params, 0)
	if err != nil {
		return false, err
	}

	if len(monitors) > 0 {
		return true, nil
	}
	return false, nil
}

func (s MonitorService) UpdateMonitor(ctx context.Context, monitor Monitor) error {
	if err := s.Repository.UpdateMonitor(ctx, monitor); err != nil {
		return err
	}

	s.distributor <- StopMessage{
		Id: *monitor.Id,
	}
	if monitor.Active {
		s.distributor <- StartMessage{
			Monitor: monitor,
		}
	}

	return nil
}
