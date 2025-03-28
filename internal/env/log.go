package env

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"os"
	"reflect"
	"strings"

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
		logger:  log.New(out, "", 0),
	}
	return h
}

type defaultHandler struct {
	slog.Handler
	logger *log.Logger
}

func formatLevel(r slog.Record) string {
	var level string
	c := Env.EnableColor
	rs := r.Level.String()
	switch r.Level {
	case slog.LevelDebug:
		level = graphics.MagentaC(rs, c)
	case slog.LevelInfo:
		level = graphics.CyanC(rs, c)
	case slog.LevelWarn:
		level = graphics.YellowC(rs, c)
	case slog.LevelError:
		level = graphics.RedC(rs, c)
	}
	return level
}

func formatFlat(r slog.Record) (string, error) {
	var fields []string
	r.Attrs(func(a slog.Attr) bool {
		fields = append(fields, fmt.Sprintf("%s=%v", a.Key, a.Value))
		return true
	})

	time := r.Time.Format(Env.StdoutTimeFormat)
	return fmt.Sprintf("[%s] %s: %s %s", time, formatLevel(r), r.Message, strings.Join(fields, " ")), nil
}

func formatNested(r slog.Record, increment string) (string, error) {
	var s strings.Builder
	r.Attrs(func(a slog.Attr) bool {
		fmt.Fprintf(&s, "\n%s%s: %s", increment, a.Key, fNest(a.Value.Any(), increment))
		return true
	})

	time := r.Time.Format(Env.StdoutTimeFormat)
	return fmt.Sprintf("[%s] %s: %s%s", time, formatLevel(r), r.Message, s.String()), nil
}

func formatJSON(r slog.Record) (string, error) {
	fields := make(map[string]any, r.NumAttrs()+2)
	r.Attrs(func(a slog.Attr) bool {
		fields[a.Key] = a.Value.Any()
		return true
	})
	time := r.Time.Format(Env.StdoutTimeFormat)
	fields["time"] = time
	fields["message"] = r.Message

	var bytes []byte
	var err error
	bytes, err = json.Marshal(fields)

	return string(bytes), err
}

func (d *defaultHandler) Handle(ctx context.Context, r slog.Record) error {
	var output string
	var err error

	const increment = "  "

	f := Env.StdoutFormat
	switch f {
	case Flat:
		output, err = formatFlat(r)
	case Nested:
		output, err = formatNested(r, increment)
	case JSON:
		output, err = formatJSON(r)
	}
	if err != nil {
		return fmt.Errorf("failed to format output: %w", err)
	}

	d.logger.Println(output)
	return nil
}

// fNest (and all fNest* functions) handle formatting in "nested" format mode.

func fNest(value any, increment string) string {
	val := reflect.ValueOf(value)
	switch val.Kind() {
	case reflect.Map:
		return fNestMap(val, increment, increment)
	case reflect.Slice:
		return fNestSlice(val, increment, increment)
	default:
		return fmt.Sprintf("%v", value)
	}
}

// Parameter "indent" represents the current reducer state indentation level,
// and "increment" is the amount of indentation to add at each step.

func fNestMap(m reflect.Value, indent, increment string) string {
	if m.Len() == 0 {
		return "{}"
	}
	step := indent + increment

	var sb strings.Builder
	sb.WriteString("{\n")
	for _, key := range m.MapKeys() {
		mapKey := key.Interface()
		mapValue := m.MapIndex(key).Interface()
		sb.WriteString(step)
		sb.WriteString(fmt.Sprintf("%q: %s\n", mapKey, fNest(mapValue, step)))
	}

	sb.WriteString(indent + "}")
	return sb.String()
}

func fNestSlice(slice reflect.Value, indent, increment string) string {
	if slice.Len() == 0 {
		return "[]"
	}
	step := indent + increment

	var sb strings.Builder
	sb.WriteString("[\n")
	for i := range slice.Len() {
		item := slice.Index(i).Interface()
		sb.WriteString(step)
		sb.WriteString(fmt.Sprintf("[%d]: %s\n", i+1, fNest(item, step)))
	}

	sb.WriteString(indent + "]")
	return sb.String()
}

func standardOptions() slog.HandlerOptions {
	return slog.HandlerOptions{
		AddSource:   false,
		Level:       slog.LevelInfo,
		ReplaceAttr: nil,
	}
}

func verboseOptions() slog.HandlerOptions {
	return slog.HandlerOptions{
		AddSource:   false,
		Level:       slog.LevelDebug,
		ReplaceAttr: nil,
	}
}
