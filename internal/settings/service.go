package settings

import (
	"context"
)

// NewSettingsService returns a new `SettingsService`.
func NewSettingsService(r SettingsRepository, d chan<- any) SettingsService {
	return SettingsService{Repository: r, Distributor: d}
}

// SettingsService is a service used to interact with the settings domain type.
type SettingsService struct {
	Distributor chan<- any
	Repository  SettingsRepository
}

func (m SettingsService) GetSettings(ctx context.Context) (Settings, error) {
	delimiters, err := m.GetDelimiters(ctx)
	if err != nil {
		return Settings{}, err
	}

	return Settings{Delimiters: delimiters}, nil
}

func (m SettingsService) GetDelimiters(ctx context.Context) ([]string, error) {
	delimiters, err := m.Repository.SelectDelimiters(ctx)
	if err != nil {
		return []string{}, err
	}
	if len(delimiters) == 0 {
		delimiters = []string{DefaultOpenDelimiter, DefaultCloseDelimiter}
	}

	return delimiters, nil
}

func (m SettingsService) UpdateSettings(ctx context.Context, s Settings) error {
	// Update repository.
	err := m.Repository.UpdateSettings(ctx, s)
	if err != nil {
		return err
	}

	// Queue distributor settings update.
	m.Distributor <- SettingsMessage{
		Settings: s,
	}

	return nil
}
