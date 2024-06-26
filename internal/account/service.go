package account

// NewAccountService returns a new `AccountService`.
func NewAccountService(repository AccountRepository) AccountService {
	return AccountService{repository}
}

// AccountService is a service used to interact with the account domain type.
type AccountService struct {
	repository AccountRepository
}
