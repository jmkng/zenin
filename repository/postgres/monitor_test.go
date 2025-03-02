package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/jmkng/zenin/internal/debug"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

const SKIP_KEY string = "ZENIN_TEST_POSTGRES"

func TestSelectMonitorAll(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	all := monitor.SelectMonitorParams{}
	monitors, err := repository.SelectMonitor(context.Background(), 0, &all)
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(monitors), 8)
}

func TestSelectMonitorActive(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	active := true
	a, err := repository.SelectMonitor(context.Background(), 0, &monitor.SelectMonitorParams{
		Id:     nil,
		Active: &active,
		Kind:   nil,
	})
	if err != nil {
		t.FailNow()
	}

	active = false
	b, err := repository.SelectMonitor(context.Background(), 0, &monitor.SelectMonitorParams{
		Id:     nil,
		Active: &active,
		Kind:   nil,
	})
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(a), 0)
	debug.AssertEqual(t, len(b), 8)
}

func TestSelectMonitorKind(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	kind := measurement.HTTP
	http, err := repository.SelectMonitor(context.Background(), 0, &monitor.SelectMonitorParams{
		Id:     nil,
		Active: nil,
		Kind:   &kind,
	})
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(http), 6)
}

func TestSelectMonitorWithRelated(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	monitors, err := repository.SelectMonitor(context.Background(), 5, &monitor.SelectMonitorParams{
		Id:     &[]int{1},
		Active: nil,
		Kind:   nil,
	})
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(monitors), 1)
	debug.AssertEqual(t, *monitors[0].Id, 1)
	debug.AssertEqual(t, len(monitors[0].Measurements), 1)
}

func TestSelectMonitorMeasurements(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	measurements, err := repository.SelectMeasurement(context.Background(), 2, nil)
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(measurements), 4)
}

func postgresRepository(t *testing.T) monitor.MonitorRepository {
	t.Helper()
	repository, err := NewPostgresRepository(env.Database)
	if err != nil {
		t.FailNow()
	}
	return repository
}

func skip(t *testing.T) {
	t.Skipf("environment variable %v not set", SKIP_KEY)
}
