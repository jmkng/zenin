package mock

import (
	"github.com/jmkng/zenin/internal/measurement"
	"golang.org/x/net/context"
)

// InsertMeasurement implements `MeasurementRepository.InsertMeasurement` for `MockRepository`.
func (m MockRepository) InsertMeasurement(ctx context.Context, measurement measurement.Measurement) (int, error) {
	return -1, nil
}

// SelectCertificate implements `MeasurementRepository.SelectCertificate` for `MockRepository`.
func (m MockRepository) SelectCertificate(ctx context.Context, id int) ([]measurement.Certificate, error) {
	return []measurement.Certificate{}, nil
}

// DeleteMeasurement implements `MeasurementRepository.SelectCertificate` for `MockRepository`.
func (m MockRepository) DeleteMeasurement(ctx context.Context, id []int) error {
	return nil
}
