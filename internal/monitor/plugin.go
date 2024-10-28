package monitor

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
)

// NewPluginProbe returns a new `PluginProbe`
func NewPluginProbe() PluginProbe {
	return PluginProbe{}
}

type PluginProbe struct{}

// Poll implements `Probe.Poll` for `PluginProbe`.
func (s PluginProbe) Poll(m Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)
	command := *m.PluginName

	path := filepath.Join(env.Runtime.PluginsDir, command)
	_, err := os.Stat(path)
	if err != nil {
		span.Downgrade(measurement.Dead, "Plugin was not found.")
		return span
	}

	var args []string
	if m.PluginArgs != nil {
		args = append(args, *m.PluginArgs...)
	}

	deadline, cancel := m.Deadline(context.Background())
	defer cancel()

	cmd := exec.CommandContext(deadline, path, args...)
	switch runtime.GOOS {
	case "windows":
		if strings.HasSuffix(command, ".ps1") {
			panic("todo")
		}
	case "darwin", "linux":
		if strings.HasSuffix(command, ".sh") {
			shell, exists := os.LookupEnv("SHELL")
			if !exists {
				span.Downgrade(measurement.Dead, "Shell environment variable is not accessible.")
				return span
			}
			args := append([]string{path}, args...)
			cmd = exec.Command(shell, args...)
		}
	}
	stdoutPipe, stdoutPipeErr := cmd.StdoutPipe()
	if stdoutPipeErr != nil {
		span.Downgrade(measurement.Warn, "Failed to access plugin output stream.")
	}
	stderrPipe, stderrPipeErr := cmd.StderrPipe()
	if stderrPipeErr != nil {
		span.Downgrade(measurement.Warn, "Failed to access plugin error stream.")
	}

	if err := cmd.Start(); err != nil {
		span.Downgrade(measurement.Dead, "Failed to start plugin.")
		return span
	}

	var stdout *bytes.Buffer
	if stdoutPipeErr == nil {
		b, err := io.ReadAll(stdoutPipe)
		if err != nil {
			span.Downgrade(measurement.Warn, "Failed to read plugin output stream.")
		} else {
			stdout = bytes.NewBuffer(b)
		}
	}
	var stderr *bytes.Buffer
	if stderrPipeErr == nil {
		b, err := io.ReadAll(stderrPipe)
		if err != nil {
			span.Downgrade(measurement.Warn, "Failed to read plugin error stream.")
		} else {
			stderr = bytes.NewBuffer(b)
		}
	}

	def := 0
	span.PluginExitCode = &def
	err = cmd.Wait()
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			span.Downgrade(measurement.Dead, TimeoutMessage)
			return span
		} else if exit, ok := err.(*exec.ExitError); ok {
			code := exit.ExitCode()
			span.PluginExitCode = &code

			switch code {
			case 0:
				break
			case 1:
				span.Downgrade(measurement.Warn, "Plugin returned a warn exit code.")
			default:
				span.Downgrade(measurement.Dead, "Plugin returned a dead exit code.")
			}
		} else {
			span.Downgrade(measurement.Dead, "Failed to execute plugin.")
		}
	}

	if stdout != nil {
		str := strings.TrimSpace(stdout.String())
		span.PluginStdout = &str
	}
	if stderr != nil {
		str := strings.TrimSpace(stderr.String())
		span.PluginStderr = &str
	}
	return span
}
