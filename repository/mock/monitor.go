package mock

import (
	"context"
	"time"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `MockRepository`.
func (p MockRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	return -1, nil
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `MockRepository`.
func (p MockRepository) SelectMonitor(ctx context.Context, measurements int, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	return []monitor.Monitor{}, nil
}

// SelectMeasurement implements `MonitorRepository.SelectMeasurement` for `MockRepository`.
func (p MockRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	return []measurement.Measurement{}, nil
}

// UpdateMonitor implements `MonitorRepository.UpdateMonitor` for `MockRepository`.
func (p MockRepository) UpdateMonitor(ctx context.Context, monitor monitor.Monitor) error {
	return nil
}

// DeleteMonitor implements `MonitorRepository.DeleteMonitor` for `MockRepository`.
func (p MockRepository) DeleteMonitor(ctx context.Context, id []int) error {
	return nil
}

// ToggleMonitor implements `MonitorRepository.ToggleMonitor` for `MockRepository`.
func (p MockRepository) ToggleMonitor(ctx context.Context, id []int, active bool, time time.Time) error {
	return nil
}
