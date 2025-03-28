package settings

import (
	"context"
)

// SettingsRepository is a type used to interact with the settings domain database table.
type SettingsRepository interface {
	SelectSettings(ctx context.Context) (Settings, error)
	UpdateSettings(ctx context.Context, settings Settings) error
}
