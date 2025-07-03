package probe

import (
	"context"
)

type PluginAttributes struct {
	Stdout, Stderr string
	ExitCode       int
}

type Plugin struct {
	Path string
}

func (p Plugin) Poll(ctx context.Context) Output {
	return Output{
		State: StateOk,
		Hints: []string{},
		Attributes: PluginAttributes{
			Stdout:   "stdout",
			Stderr:   "stderr",
			ExitCode: 0,
		},
	}
}
