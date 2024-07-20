package repository

import (
	"errors"
	"fmt"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/repository"
	"github.com/jmkng/zenin/repository/postgres"
)

func Builder(env *env.DatabaseEnv) *RepositoryBuilder {
	return &RepositoryBuilder{
		env:          env,
		withValidate: false,
	}
}

// WithValidate will cause the Repository connection to be tested
// when `build` is called.
func (b *RepositoryBuilder) WithValidate() *RepositoryBuilder {
	b.withValidate = true
	return b
}

// Build will return a Repository from the builder.
func (b RepositoryBuilder) Build() (repository.Repository, error) {
	var repository repository.Repository
	var err error

	switch b.env.Kind {
	case env.Postgres:
		repository, err = postgres.NewPostgresRepository(b.env)
	default:
		err = errors.New("must specify database kind with `ZENIN_DB_KIND` environment variable")
	}
	if err != nil {
		return repository, err
	}

	if b.withValidate {
		log.Debug("repository validation starting")
		if err = b.validate(repository); err != nil {
			return repository, fmt.Errorf("failed to connect repository: %w", err)
		}
		log.Debug("repository normal")
	}
	return repository, err
}

func (r *RepositoryBuilder) validate(repository repository.Repository) error {
	valid, err := repository.Validate()
	if err != nil {
		return fmt.Errorf("failed to validate repository schema: %w", err)
	}
	if !valid {
		log.Debug("repository abnormal, attempting automatic migration")
		return repository.Migrate()
	}
	return nil
}

type RepositoryBuilder struct {
	env *env.DatabaseEnv
	// withValidate is true when the Repository should be validated before building.
	withValidate bool
}
