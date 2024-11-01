package main

import (
	"context"
	"fmt"
	"os"

	g "github.com/jmkng/zenin/pkg/graphics"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/meta"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/service"
	"github.com/jmkng/zenin/repository"
	"github.com/jmkng/zenin/repository/mock"
	"github.com/jmkng/zenin/server"
)

func main() {
	if env.Runtime.Kind == env.Dev {
		env.EnableDebug()
	}
	env.Debug("main starting")

	commit := ""
	if env.Runtime.Kind == env.Dev {
		commit = " " + env.Commit
	}

	c := env.Runtime.Color
	fmt.Printf("Zenin %v%v\n", env.Version, g.MagentaC(commit, c))
	fmt.Printf("%v Environment\n", g.BrightBlackC(">", c))
	fmt.Printf("Base: %v\n", env.Runtime.BaseDir)
	fmt.Printf("Plugins: %v\n", env.Runtime.PluginsDir)

	diag := env.NewDiagnostic()
	env.Runtime.Health(&diag)
	if diag.Report() {
		os.Exit(1)
	}

	meta := meta.NewMetaService(mock.NewMockRepository())
	plugins, err := meta.GetPlugins()
	dd(err)

	fmt.Printf("Using %v plugins\n", g.BrightBlackC(fmt.Sprintf("%v", len(plugins)), c))
	for _, v := range plugins {
		fmt.Printf("    [%v]\n", g.BrightBlackC(v, c))
	}

	repository, err := repository.
		Builder(env.Database).
		WithValidate().
		Build()
	dd(err)

	bundle := service.NewBundle(repository)

	// Resume polling active monitors.
	active, err := bundle.Monitor.GetActive(context.Background())
	dd(err)

	env.Debug("restoring distributor state", "active", len(active))
	for _, v := range active {
		bundle.Monitor.Distributor <- monitor.StartMessage{Monitor: v}
	}

	// 🌩️ ->
	fmt.Printf("%v Server\n", g.BrightBlackC(">", c))
	err = server.
		NewServer(server.NewConfiguration(env.Runtime), bundle).
		Serve()
	dd(err)

	env.Debug("main stopping")
}

// dd will log an error and exit, or do nothing if err == nil.
func dd(err error) {
	if err == nil {
		return
	}
	fmt.Println(err.Error())
	os.Exit(1)
}
