package postgres

import (
	"context"
	"os"
	"testing"
	"time"

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

	debug.AssertEqual(t, len(a), 1)
	debug.AssertEqual(t, len(b), 7)
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
	debug.AssertEqual(t, len(monitors[0].Measurements), 2)
	if *monitors[0].Measurements[0].Id < *monitors[0].Measurements[1].Id {
		t.Fatal("measurements should be sorted newest first")
	}
}

func TestSelectMonitorMeasurements(t *testing.T) {
	if _, set := os.LookupEnv(SKIP_KEY); !set {
		skip(t)
	}
	repository := postgresRepository(t)
	before, err := time.Parse("1/2/2006", "7/3/2024")
	if err != nil {
		t.FailNow()
	}
	measurements, err := repository.SelectMeasurement(context.Background(), 2, &monitor.SelectMeasurementParams{
		After:  nil,
		Before: &before,
	})
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(measurements), 2)
	if *measurements[0].Id < *measurements[1].Id {
		t.Fatal("measurements should be sorted newest first")
	}
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
