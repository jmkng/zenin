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
	if env.Runtime.Kind == env.Dev {
		env.EnableDebug()
	}
	env.Debug("main starting")

	ctx := context.Background()

	commit := ""
	if env.Runtime.Kind == env.Dev {
		commit = " " + env.Commit
	}
	c := env.Runtime.Color
	fmt.Printf("Zenin %v%v\n", env.Version, g.MagentaC(commit, c))
	fmt.Printf("%v Environment\n", g.BrightBlackC(">", c))
	fmt.Printf("Base: %v\n", env.Runtime.BaseDir)
	fmt.Printf("Plugins: %v\n", env.Runtime.PluginsDir)

	dx := env.Runtime.Diagnose()
	for _, w := range dx.Warnings {
		env.Warn(w)
	}
	for _, e := range dx.Errors {
		env.Error(e)
	}
	if dx.Fatal() {
		os.Exit(1)
	}

	repository, err := repository.Builder(env.Database).
		WithValidate().
		Build()
	dd(err)

	channel := make(chan any, 1)

	mosv := monitor.NewMonitorService(repository, channel)
	plugins, err := mosv.GetPlugins()
	dd(err)

	fmt.Printf("Using %v plugins\n", g.BrightBlackC(fmt.Sprintf("%v", len(plugins)), c))
	for _, v := range plugins {
		fmt.Printf("    [%v]\n", g.BrightBlackC(v, c))
	}

	ssv := settings.NewSettingsService(repository, channel)
	settings, err := ssv.GetSettings(ctx)
	dd(err)

	mesv := measurement.NewMeasurementService(repository)
	distributor := monitor.NewDistributor(mesv, settings)
	go distributor.Listen(channel)

	active, err := mosv.GetActive(context.Background())
	dd(err)

	env.Debug("restoring distributor state", "active", len(active))
	for _, v := range active {
		channel <- monitor.StartMessage{Monitor: v}
	}

	asv := account.NewAccountService(repository)

	// Start server.
	fmt.Printf("%v Server\n", g.BrightBlackC(">", c))
	server.
		NewServer(server.NewConfig(env.Runtime),
			server.Services{Settings: ssv, Measurement: mesv, Monitor: mosv, Account: asv}).
		Serve()
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
