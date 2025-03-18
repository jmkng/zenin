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

	before, err := repository.SelectSettings(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if before.Delimiters == nil {
		t.Fatal("expected test fixture with delimiters")
	}
	debug.AssertEqual(t, len(*before.Delimiters), 2)
	debug.AssertEqual(t, (*before.Delimiters)[0], "<<")
	debug.AssertEqual(t, (*before.Delimiters)[1], ">>")

	open := "[["
	close := "]]"
	theme := "Test.css"
	delimiters := internal.ArrayValue([]string{open, close})
	update := settings.Settings{
		Delimiters: &delimiters,
		Theme:      &theme,
	}
	err = repository.UpdateSettings(ctx, update)
	if err != nil {
		t.Fatal(err)
	}

	after, err := repository.SelectSettings(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.Delimiters == nil {
		t.Fatalf("delimiters %v and %v must be set", open, close)
	}
	if after.Theme == nil {
		t.Fatalf("theme %v must be set", theme)
	}
	debug.AssertEqual(t, len(*after.Delimiters), 2)
	debug.AssertEqual(t, (*after.Delimiters)[0], open)
	debug.AssertEqual(t, (*after.Delimiters)[1], close)
	debug.AssertEqual(t, *after.Theme, theme)
}

func TestSelectSettings(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	settings, err := repository.SelectSettings(ctx)
	if err != nil {
		t.Fatal(err)
	}
	debug.AssertEqual(t, len(*settings.Delimiters), 2)
	debug.AssertEqual(t, (*settings.Delimiters)[0], "<<")
	debug.AssertEqual(t, (*settings.Delimiters)[1], ">>")
}
