package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/bundle"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/repository"
	"github.com/jmkng/zenin/server"
)

func main() {
	log.Debug("main starting")
	if env.Runtime.Kind == env.Dev {
		log.EnableDebug()
	}

	fmt.Println(os.Args[0])
	os.Exit(0)

	// Check environment.
	dd(validate()) // TODO: Pretty print these?

	repository, err := repository.
		Builder(env.Database).
		WithValidate(). // TODO: Bundle this up in validate step above?
		Build()
	dd(err)

	bundle := bundle.NewBundle(repository)

	// List plugins.
	plugins, err := bundle.Meta.GetPlugins()
	dd(err)
	files := fmt.Sprintf("[%v]", strings.Join(plugins, ","))
	log.Info("plugins", "path", env.Runtime.PluginDir, "count", len(plugins), "files", files)

	// Resume polling active monitors.
	active, err := bundle.Monitor.GetActive(context.Background())
	dd(err)
	log.Debug("resuming active monitors", "count", len(active))
	for _, v := range active {
		bundle.Monitor.Distributor <- monitor.StartMessage{Monitor: v}
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

// validate will run all validations, returning all messages bundled in a single `Validation`.
func validate() internal.Validation {
	v := internal.NewValidation()

	// 1. Runtime
	v.Join(env.Runtime.Validate())

	return v
}
