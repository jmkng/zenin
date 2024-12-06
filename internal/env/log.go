package env

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"log/slog"
	"os"

	"github.com/jmkng/zenin/pkg/graphics"
)

// Info will log a message to stdout at "Info" level.
func Info(msg string, args ...any) {
	Logger.Info(msg, args...)
}

// Debug will log a message to stdout at "Debug" level.
func Debug(msg string, args ...any) {
	Logger.Debug(msg, args...)
}

// Warn will log a message to stdout at "Warn" level.
func Warn(msg string, args ...any) {
	Logger.Warn(msg, args...)
}

// Error will log a message to stdout at "Error" level.
func Error(msg string, args ...any) {
	Logger.Error(msg, args...)
}

// EnableDebug will enable debug logging.
func EnableDebug() {
	Logger = newLogger(verboseOptions())
}

// Logger is the global logging mechanism.
var Logger = newLogger(standardOptions())

func newLogger(o slog.HandlerOptions) *slog.Logger {
	logger := slog.New(newDefaultHandler(os.Stdout, o))
	return logger
}

func newDefaultHandler(out io.Writer, opts slog.HandlerOptions) *defaultHandler {
	h := &defaultHandler{
		Handler: slog.NewJSONHandler(out, &opts),
		l:       log.New(out, "", 0),
	}
	return h
}

type defaultHandler struct {
	slog.Handler
	l *log.Logger
}

func (d *defaultHandler) Handle(ctx context.Context, r slog.Record) error {
	level := r.Level.String() + ":"

	c := Runtime.Color
	switch r.Level {
	case slog.LevelDebug:
		level = graphics.MagentaC(level, c)
	case slog.LevelInfo:
		level = graphics.CyanC(level, c)
	case slog.LevelWarn:
		level = graphics.YellowC(level, c)
	case slog.LevelError:
		level = graphics.RedC(level, c)
	}

	fields := make(map[string]interface{}, r.NumAttrs())
	r.Attrs(func(a slog.Attr) bool {
		fields[a.Key] = a.Value.Any()

		return true
	})

	b, err := json.MarshalIndent(fields, "", "  ") // Indented
	//b, err := json.Marshal(fields)               // Flat
	if err != nil {
		return err
	}

	timeStr := r.Time.Format("[15:05:05.000]")
	d.l.Println(timeStr, level, r.Message, string(b))

	return nil
}
