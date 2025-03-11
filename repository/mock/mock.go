package mock

// NewMockRepository returns a new `MockRepository`.
func NewMockRepository() *MockRepository {
	return &MockRepository{}
}

type MockRepository struct{}

// Validate implements `Repository.Validate` for `MockRepository`.
func (m MockRepository) Validate() (bool, error) {
	return true, nil
}

// Migrate implements `Repository.Migrate` for `MockRepository`.
func (m MockRepository) Migrate() error {
	return nil
}

// Fixture implements `Repository.Fixture` for `MockRepository`.
func (m MockRepository) Fixture() error {
	return nil
}

// Describe implements `Repository.Describe` for `MockRepository`.
func (m MockRepository) Describe() []any {
	return []any{"kind", "Mock"}
}
