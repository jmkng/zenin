package log

import (
	"log/slog"
	"os"

	"github.com/jmkng/zenin/internal/env"
)

// Info will log a message to stdout at "Info" level.
func Info(msg string, args ...any) {
	logger.Info(msg, args...)
}

// Debug will log a message to stdout at "Debug" level.
func Debug(msg string, args ...any) {
	logger.Debug(msg, args...)
}

// Warn will log a message to stdout at "Warn" level.
func Warn(msg string, args ...any) {
	logger.Warn(msg, args...)
}

// Error will log a message to stdout at "Error" level.
func Error(msg string, args ...any) {
	logger.Error(msg, args...)
}

// EnableDebug will enable debug logging.
func EnableDebug() {
	logger = newLogger(verboseOptions())
}

var logger = newLogger(standardOptions())

func newLogger(handler *slog.HandlerOptions) *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, handler))
}

func init() {
	if env.NewRuntimeEnv().Kind == env.Dev {
		EnableDebug()
	}
}
