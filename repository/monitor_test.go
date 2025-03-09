package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/debug"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/repository"
)

const SkipKey string = "ZENIN_DB_ENABLE_TEST"

func TestToggleMonitor(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	before, err := repository.SelectMonitor(ctx, 0, &monitor.SelectMonitorParams{
		Id:     &[]int{1},
		Active: nil,
		Kind:   nil,
	})
	if err != nil {
		t.Fatalf("failed to select monitors before toggle: %v", err)
	}
	if before[0].Active {
		t.Fatal("expected test fixture with inactive monitor")
	}

	updatedAt := internal.NewTimeValue(time.Now())
	err = repository.ToggleMonitor(ctx, []int{1}, true, updatedAt)
	if err != nil {
		t.Fatalf("failed to toggle monitor: %v", err)
	}

	after, err := repository.SelectMonitor(ctx, 0, &monitor.SelectMonitorParams{
		Id:     &[]int{1},
		Active: nil,
		Kind:   nil,
	})
	if err != nil {
		t.Fatalf("failed to select monitors after toggle: %v", err)
	}

	debug.Assert(t, after[0].Active)
}

func TestInsertMonitor(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	before, err := repository.SelectMonitor(ctx, 0, nil)
	if err != nil {
		t.Fatalf("failed to select monitors before insert: %v", err)
	}

	debug.Assert(t, len(before) == 8, "expected test fixture with 8 monitors")
	time := internal.NewTimeValue(time.Now().Add(time.Hour * 48))
	monitor := monitor.Monitor{
		CreatedAt: time,
		UpdatedAt: time,
		Name:      "Test Fixture A",
		Kind:      "HTTP",
		Active:    false,
		Interval:  10000,
		Timeout:   10000,
	}
	id, err := repository.InsertMonitor(ctx, monitor)
	if err != nil {
		t.Fatalf("failed to insert monitor: %v", err)
	}

	debug.AssertEqual(t, id, 9)
}

func TestUpdateMonitor(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	id := 1
	params := monitor.SelectMonitorParams{
		Id:     &[]int{id},
		Active: nil,
		Kind:   nil,
	}
	before, err := repository.SelectMonitor(ctx, 0, &params)
	if err != nil {
		t.Fatalf("failed to select monitors before update: %v", err)
	}
	name := before[0].Name
	if name != "Mercury" {
		t.Fatalf("unexpected monitor name: %v != Mercury", name)
	}

	expect := "Mercury2"
	monitor := monitor.Monitor{
		Id:       &id,
		Interval: 1,
		Kind:     measurement.HTTP,
		Name:     expect,
	}
	err = repository.UpdateMonitor(ctx, monitor)
	if err != nil {
		t.Fatalf("failed to update monitor: %v", err)
	}

	after, err := repository.SelectMonitor(ctx, 0, &params)
	if err != nil {
		t.Fatalf("failed to select monitors before update: %v", err)
	}
	got := after[0].Name

	debug.AssertEqual(t, got, expect)
}

func TestDeleteMonitor(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	before, err := repository.SelectMonitor(ctx, 0, nil)
	if err != nil {
		t.Fatalf("failed to select monitors before delete: %v", err)
	}
	beforeLen := len(before)
	if beforeLen != 8 {
		t.Fatalf("expected test fixture with 8 monitors: %v != 8", beforeLen)
	}

	err = repository.DeleteMonitor(ctx, []int{1})
	if err != nil {
		t.Fatalf("failed to delete monitor: %v", err)
	}

	after, err := repository.SelectMonitor(ctx, 0, nil)
	if err != nil {
		t.Fatalf("failed to select monitors after delete: %v", err)
	}
	afterLen := len(after)

	debug.AssertEqual(t, afterLen, beforeLen-1)
}

func TestSelectMonitorAll(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)
	monitors, err := repository.SelectMonitor(context.Background(), 0, nil)
	if err != nil {
		t.Fatalf("failed to select all monitors: %v", err)
	}

	debug.AssertEqual(t, len(monitors), 8)
}

func TestSelectMonitorActive(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)
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
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)
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
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)
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
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)
	measurements, err := repository.SelectMeasurement(context.Background(), 2, nil)
	if err != nil {
		t.FailNow()
	}

	debug.AssertEqual(t, len(measurements), 4)
}

func fixture(t *testing.T) repository.Repository {
	repository, err := Builder(env.Database, env.Runtime).Build()
	if err != nil {
		t.Fatalf("failed to build repository: %v", err)
	}
	err = repository.Fixture()
	if err != nil {
		t.Fatalf("failed to build test fixture: %v", err)
	}
	return repository
}

func skip(t *testing.T) {
	t.Skipf("environment variable %v not set", SkipKey)
}
