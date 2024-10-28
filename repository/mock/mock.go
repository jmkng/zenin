package mock

// NewMockRepository returns a new `MockRepository`.
func NewMockRepository() *MockRepository {
	return &MockRepository{}
}

type MockRepository struct{}

// Validate implements `Repository.Validate` for `MockRepository`.
func (p MockRepository) Validate() (bool, error) {
	return true, nil
}

// Migrate implements `Repository.Migrate` for `MockRepository`.
func (p MockRepository) Migrate() error {
	return nil
}
