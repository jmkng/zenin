package sqlite

import (
	"testing"

	"github.com/jmkng/zenin"
	"github.com/jmkng/zenin/repository"
)

func TestRepository(t *testing.T) {
	init := func() (zenin.Repository, func()) {
		sqlite, err := New(":memory:", Opts{
			DisableWAL: true, // WAL not supported with :memory:
		})
		if err != nil {
			t.Fatalf("creating in-memory db: %v", err)
		}
		return sqlite, func() {} // No cleanup required.
	}
	repository.Test(t, init, repository.TestOpts{})
}
