package mock

import (
	"github.com/jmkng/zenin/internal/measurement"
	"golang.org/x/net/context"
)

// InsertMeasurement implements `MeasurementRepository.InsertMeasurement` for `MockRepository`.
func (p MockRepository) InsertMeasurement(ctx context.Context, measurement measurement.Measurement) (int, error) {
	return -1, nil
}

// SelectCertificate implements `MeasurementRepository.SelectCertificate` for `MockRepository`.
func (p MockRepository) SelectCertificate(ctx context.Context, id int) ([]measurement.Certificate, error) {
	return []measurement.Certificate{}, nil
}
