package mock

import (
	"context"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `MockRepository`.
func (m MockRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	return -1, nil
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `MockRepository`.
func (m MockRepository) SelectMonitor(ctx context.Context, measurements int, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	return []monitor.Monitor{}, nil
}

// SelectMeasurement implements `MonitorRepository.SelectMeasurement` for `MockRepository`.
func (m MockRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	return []measurement.Measurement{}, nil
}

// UpdateMonitor implements `MonitorRepository.UpdateMonitor` for `MockRepository`.
func (m MockRepository) UpdateMonitor(ctx context.Context, monitor monitor.Monitor) error {
	return nil
}

// DeleteMonitor implements `MonitorRepository.DeleteMonitor` for `MockRepository`.
func (m MockRepository) DeleteMonitor(ctx context.Context, id []int) error {
	return nil
}

// ToggleMonitor implements `MonitorRepository.ToggleMonitor` for `MockRepository`.
func (m MockRepository) ToggleMonitor(ctx context.Context, id []int, active bool, time internal.TimeValue) error {
	return nil
}
