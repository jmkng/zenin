package repository

import (
	"errors"
	"fmt"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/repository"
	"github.com/jmkng/zenin/repository/postgres"
	"github.com/jmkng/zenin/repository/sqlite"
)

const SkipKey string = "ZENIN_DB_ENABLE_TEST"

func Builder(db *env.DatabaseEnv, rt *env.RuntimeEnv) *RepositoryBuilder {
	return &RepositoryBuilder{
		db:           db,
		rt:           rt,
		withValidate: false,
	}
}

// WithValidate will cause the `Repository` connection to be tested
// when build is called.
func (b *RepositoryBuilder) WithValidate() *RepositoryBuilder {
	b.withValidate = true
	return b
}

// Build will return a `Repository` from the builder.
func (b RepositoryBuilder) Build() (repository.Repository, error) {
	var repository repository.Repository
	var err error

	switch b.db.Kind {
	case env.Postgres:
		repository, err = postgres.NewPostgresRepository(b.db)
	case env.SQLite:
		repository, err = sqlite.NewSQLiteRepository(b.db, b.rt)
	default:
		err = errors.New("must specify recognized database kind with `ZENIN_DB_KIND` environment variable")
	}
	if err != nil {
		return repository, err
	}

	// Validation step will connect to check the schema, migrating if needed.
	if b.withValidate {
		env.Debug("repository validation starting")
		valid, err := repository.Validate()
		if err != nil {
			return repository, fmt.Errorf("failed to validate repository: %w", err)
		}

		if !valid {
			env.Debug("repository migration starting")
			if err := repository.Migrate(); err != nil {
				return repository, err
			}
			env.Debug("repository migration stopping")
		}

		env.Debug("repository validation stopping")
	}

	return repository, err
}

type RepositoryBuilder struct {
	db           *env.DatabaseEnv
	rt           *env.RuntimeEnv
	withValidate bool
}
