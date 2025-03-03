package sqlite

import (
	"github.com/jmkng/zenin/internal/measurement"
	"golang.org/x/net/context"
)

// InsertMeasurement implements `MeasurementRepository.InsertMeasurement` for `SQLiteRepository`.
func (s SQLiteRepository) InsertMeasurement(ctx context.Context, measurement measurement.Measurement) (int, error) {
	return -1, nil
}

// SelectCertificate implements `MeasurementRepository.SelectCertificate` for `SQLiteRepository`.
func (s SQLiteRepository) SelectCertificate(ctx context.Context, id int) ([]measurement.Certificate, error) {
	return []measurement.Certificate{}, nil
}

// DeleteMeasurement implements `MeasurementRepository.SelectCertificate` for `SQLiteRepository`.
func (s SQLiteRepository) DeleteMeasurement(ctx context.Context, id []int) error {
	return nil
}
