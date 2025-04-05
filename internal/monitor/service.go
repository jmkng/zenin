package monitor

import (
	"context"
	"io/fs"
	"path/filepath"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/env"
)

// NewMonitorService returns a new `MonitorService`.
func NewMonitorService(r MonitorRepository, d chan<- any) MonitorService {
	return MonitorService{
		Repository:  r,
		Distributor: d,
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

func (s MonitorService) CreateMonitor(ctx context.Context, monitor Monitor) (int, internal.TimestampValue, error) {
	time := internal.NewTimeValue(time.Now())
	monitor.CreatedAt = time
	monitor.UpdatedAt = time
	id, err := s.Repository.InsertMonitor(ctx, monitor)
	if err != nil {
		return -1, internal.TimestampValue{}, err
	}

	updated, err := s.Repository.SelectMonitor(ctx, 0, &SelectMonitorParams{
		Id: &[]int{id},
	})
	if err != nil {
		return -1, internal.TimestampValue{}, err
	}
	if monitor.Active {
		s.Distributor <- StartMessage{
			Monitor: updated[0],
		}
	}

	return id, internal.TimestampValue{
		Time: time,
	}, nil
}

func (s MonitorService) UpdateMonitor(ctx context.Context, monitor Monitor) (internal.TimestampValue, error) {
	time := internal.NewTimeValue(time.Now())
	monitor.UpdatedAt = time
	id := monitor.Id

	if err := s.Repository.UpdateMonitor(ctx, monitor); err != nil {
		return internal.TimestampValue{}, err
	}

	updated, err := s.Repository.SelectMonitor(ctx, 0, &SelectMonitorParams{
		Id: &[]int{*id},
	})
	if err != nil {
		return internal.TimestampValue{}, err
	}

	s.Distributor <- StopMessage{
		Id: *id,
	}
	if monitor.Active {
		s.Distributor <- StartMessage{
			Monitor: updated[0],
		}
	}

	return internal.TimestampValue{
		Time: time,
	}, nil
}

func (m MonitorService) GetPlugins() ([]string, error) {
	var plugins []string
	root := env.Env.PluginsDir

	supported := map[string]struct{}{
		".exe": {}, ".sh": {}, ".ps1": {}, ".bat": {},
	}

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		ext := filepath.Ext(d.Name())

		// Filter unsupported extensions.
		if _, ok := supported[ext]; ok || ext == "" {
			rel, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			plugins = append(plugins, rel)
		}

		return nil
	})

	return plugins, err
}
