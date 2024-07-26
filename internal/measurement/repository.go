package measurement

import (
	"context"
)

// MeasurementRepository is a type used to interact with the measurement domain
// database table.
type MeasurementRepository interface {
	InsertMeasurement(ctx context.Context, m Measurement) (int, error)
	GetCertificates(ctx context.Context, id int) ([]Certificate, error)
}
