package main

import (
	"context"
	"os"

	"github.com/jmkng/zenin/internal/bundle"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/repository"
	"github.com/jmkng/zenin/server"
)

func main() {
	log.Debug("main starting")

	repository, err := repository.
		Builder(env.Database).
		WithValidate().
		Build()
	dd(err)

	bundle := bundle.NewBundle(repository)

	// Resume polling active monitors.
	active, err := bundle.Monitor.GetActive(context.Background())
	dd(err)
	log.Debug("resuming active monitors", "count", len(active))
	for _, m := range active {
		bundle.Monitor.StartMonitor(m.Monitor)
	}

	// 🌩️ ->
	err = server.
		NewServer(server.NewConfiguration(env.Runtime), bundle).
		Serve()
	dd(err)

	log.Debug("main stopping")
}

// dd will receive an error, and if the error is not nil, log it and exit with status code 1.
func dd(err error) {
	if err == nil {
		return
	}
	log.Error("fatal error", "error", err)
	os.Exit(1)
}
