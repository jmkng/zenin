package main

import (
	"context"
	"fmt"
	"os"

	g "github.com/jmkng/zenin/pkg/graphics"

	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/settings"
	"github.com/jmkng/zenin/repository"
	"github.com/jmkng/zenin/server"
)

func main() {
	e := env.Env
	if e.EnableDebug {
		env.EnableDebug()
	}

	env.Debug("main starting")

	commit := ""
	if e.EnableDebug {
		commit = " " + env.Commit
	}

	fmt.Printf("Zenin %v%v\n", env.Version, g.MagentaC(commit, e.EnableColor))
	env.Info("environment", "base", e.BaseDir, "plugins", e.PluginsDir, "themes", e.ThemesDir)

	dx := env.NewDiagnostic()
	e.Diagnose(&dx)

	if dx.Log() {
		os.Exit(1)
	}

	repository, err := repository.
		Builder(e).
		WithValidate().
		Build()
	dd(err)

	asv := account.NewAccountService(repository)

	ctx := context.Background()
	claimed, err := asv.GetClaimStatus(ctx)
	dd(err)

	env.Info("repository", append(repository.Describe(), "claimed", claimed)...)

	channel := make(chan any, 1)
	mosv := monitor.NewMonitorService(repository, channel)
	plugins, err := mosv.GetPlugins()
	dd(err)

	env.Info("plugins", "count", len(plugins), "files", plugins)

	ssv := settings.NewSettingsService(repository, channel)
	settings, err := ssv.GetSettings(ctx)
	dd(err)

	mesv := measurement.NewMeasurementService(repository)
	distributor := monitor.NewDistributor(mesv, settings)
	go distributor.Listen(channel)

	active, err := mosv.GetActive(ctx)
	dd(err)

	env.Debug("restoring distributor state", "active", len(active))
	for _, v := range active {
		channel <- monitor.StartMessage{Monitor: v}
	}

	config, err := server.NewConfig(e)
	dd(err)

	err = server.NewServer(
		config,
		server.Services{Settings: ssv, Measurement: mesv, Monitor: mosv, Account: asv},
	).Serve()
	dd(err)

	env.Debug("main stopping")
}

// dd will log an error and exit, or do nothing if err == nil.
func dd(err error) {
	if err == nil {
		return
	}
	env.Error(err.Error())
	os.Exit(1)
}
