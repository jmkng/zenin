package measurement

// NewMeasurementService returns a new `MeasurementService`
func NewMeasurementService(repository MeasurementRepository) MeasurementService {
	return MeasurementService{
		Repository: repository,
	}
}

// MeasurementService is a service used to interact with the measurement domain type.
type MeasurementService struct {
	Repository MeasurementRepository
}
