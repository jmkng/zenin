package repository

import (
	"context"
	"os"
	"testing"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/debug"
	"github.com/jmkng/zenin/internal/settings"
)

func TestUpdateSettings(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()

	delimiters, err := repository.SelectDelimiters(ctx)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(delimiters), 2)
	debug.AssertEqual(t, delimiters[0], "<<")
	debug.AssertEqual(t, delimiters[1], ">>")

	open := "[["
	close := "]]"
	settings := settings.Settings{
		Delimiters: internal.ArrayValue([]string{open, close}),
	}
	err = repository.UpdateSettings(ctx, settings)
	if err != nil {
		t.Fatal(err)
	}

	delimiters, err = repository.SelectDelimiters(ctx)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(delimiters), 2)
	debug.AssertEqual(t, delimiters[0], open)
	debug.AssertEqual(t, delimiters[1], close)
}

func TestSelectDelimiters(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	delimiters, err := repository.SelectDelimiters(ctx)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(delimiters), 2)
	debug.AssertEqual(t, delimiters[0], "<<")
	debug.AssertEqual(t, delimiters[1], ">>")
}
