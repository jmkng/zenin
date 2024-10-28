package env

import "log/slog"

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
