package measurement

// NewMeasurementService returns a new `MeasurementService`
func NewMeasurementService(repository MeasurementRepository) MeasurementService {
	return MeasurementService{
		repository: repository,
	}
}

// MeasurementService is a service used to interact with the measurement domain type.
type MeasurementService struct {
	repository MeasurementRepository
}
