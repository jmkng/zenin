package sqlite

import (
	"testing"

	"github.com/jmkng/zenin/repository"
)

// TODO

func TestMeasurementRepository(t *testing.T) {
	sqlite, err := New(":memory:", Opts{})
	if err != nil {
		t.Fatalf("creating in memory sqlite database: %w", err)
	}
	repository.TestMeasurementRepository(t, sqlite.Measurement())
}
