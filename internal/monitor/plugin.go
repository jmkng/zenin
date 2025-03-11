package monitor

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"text/template"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/settings"
)

// NewPluginProbe returns a new `PluginProbe`
func NewPluginProbe(settings settings.Settings) PluginProbe {
	return PluginProbe{Settings: settings}
}

type PluginProbe struct {
	Settings settings.Settings
}

// Poll implements `Probe.Poll` for `PluginProbe`.
func (s PluginProbe) Poll(ctx context.Context, m Monitor) measurement.Span {
	span := measurement.NewSpan()

	code, stdout, stderr, dx := PluginExecutor{
		Settings: s.Settings,
		Data:     struct{ Monitor EventMonitor }{Monitor: NewEventMonitor(m)},
	}.Run(ctx, m.PluginFields)

	span.PluginExitCode = &code
	span.PluginStdout = &stdout
	span.PluginStderr = &stderr

	if len(dx.Warnings) > 0 {
		span.Downgrade(measurement.Warn)
		for _, v := range dx.Warnings {
			span.Hint(v)
		}
	}
	if len(dx.Errors) > 0 {
		span.Downgrade(measurement.Dead)
		for _, v := range dx.Errors {
			span.Hint(v)
		}
	}

	return span
}

// PluginExecutor can execute a plugin identified by a `PluginFields`.
type PluginExecutor struct {
	Settings settings.Settings
	// Data supplied to argument templates.
	Data any
}

// Run will start the plugin.
// It returns the exit code, standard output, standard error, and a `Diagnostic`.
func (p PluginExecutor) Run(ctx context.Context, f PluginFields) (int, string, string, env.Diagnostic) {
	dx := env.NewDiagnostic()

	var code int
	var stdout string
	var stderr string

	// Identify plugin.
	path := filepath.Join(env.Env.PluginsDir, *f.PluginName)
	_, err := os.Stat(path)
	if err != nil {
		dx.Error("Plugin was not found.")
		return code, stdout, stderr, dx
	}

	// Render plugin arguments.
	var args []string
	if f.PluginArgs != nil {
		for i, v := range *f.PluginArgs {
			name := fmt.Sprintf("%d", i)
			t, err := template.New(name).Delims(p.Settings.Delimiters[0], p.Settings.Delimiters[1]).Parse(v)
			if err != nil {
				dx.Error("Failed to parse plugin argument.")
				return code, stdout, stderr, dx
			}

			var result bytes.Buffer

			err = t.Execute(&result, p.Data)
			if err != nil {
				dx.Error("Failed to render plugin argument.")
				return code, stdout, stderr, dx
			}

			args = append(args, result.String())
		}
	}

	cmd := exec.CommandContext(ctx, path, args...)
	ext := filepath.Ext(*f.PluginName)

	switch runtime.GOOS {
	case "windows":
		switch ext {
		// powershell -File <path> ...
		case ".ps1":
			args = append([]string{"-File", path}, args...)
			cmd = exec.Command("powershell", args...)
		// cmd /c <path> ...
		case ".bat":
			args = append([]string{"/c", path}, args...)
			cmd = exec.Command("cmd", args...)
		}
	case "darwin", "linux":
		switch ext {
		// <shell> <path> ...
		case ".sh":
			shell, exists := os.LookupEnv("SHELL")
			if !exists {
				dx.Error("Shell environment variable is not accessible.")
				return code, stdout, stderr, dx
			}
			args := append([]string{path}, args...)
			cmd = exec.Command(shell, args...)
		}
	}

	stdoutPipe, stdoutPipeErr := cmd.StdoutPipe()
	if stdoutPipeErr != nil {
		dx.Warn("Failed to access plugin output stream.")
	}
	stderrPipe, stderrPipeErr := cmd.StderrPipe()
	if stderrPipeErr != nil {
		dx.Warn("Failed to access plugin error stream.")
	}

	// Start plugin.
	if err := cmd.Start(); err != nil {
		dx.Error("Failed to start plugin.")
		return code, stdout, stderr, dx
	}

	if stdoutPipeErr == nil {
		b, err := io.ReadAll(stdoutPipe)
		if err != nil {
			dx.Warn("Failed to read plugin output stream.")
		} else {
			stdout = string(bytes.TrimSpace(b))
		}
	}
	if stderrPipeErr == nil {
		b, err := io.ReadAll(stderrPipe)
		if err != nil {
			dx.Warn("Failed to read plugin error stream.")
		} else {
			stderr = string(bytes.TrimSpace(b))
		}
	}

	// Wait for execution, collect output.
	err = cmd.Wait()
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			dx.Error(TimeoutMessage)
			return code, stdout, stderr, dx
		} else if exit, ok := err.(*exec.ExitError); ok {
			code = exit.ExitCode()

			switch code {
			case 0:
				break
			case 1:
				dx.Warn("Plugin returned a warn exit code.")
			default:
				dx.Error("Plugin returned a dead exit code.")
			}
		} else {
			dx.Error("Failed to execute plugin.")
		}
	}

	return code, stdout, stderr, dx
}
