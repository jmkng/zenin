package postgres

import (
	"database/sql"
	_ "embed"
	"slices"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/repository"

	_ "github.com/jackc/pgx/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

// NewPostgresRepository returns a new `PostgresRepository`.
func NewPostgresRepository(env *env.DatabaseEnv) (*PostgresRepository, error) {
	db, err := sqlx.Open("pgx", "postgres://username:password@localhost:5432/postgres")
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{db}, nil
}

type PostgresRepository struct {
	db *sqlx.DB
}

// Validate implements `Validate` for `Repository`.
func (p PostgresRepository) Validate() (bool, error) {
	var rows []string
	if err := p.db.Select(&rows,
		`SELECT table_name FROM information_schema.tables WHERE table_schema = 
    	'public' AND table_type = 'BASE TABLE'`); err != nil {
		return false, err
	}
	for _, table := range repository.SchemaTables {
		if !slices.Contains(rows, table) {
			return false, nil
		}
	}
	return true, nil
}

// Migrate implements `Migrate` for `Repository`.
func (p PostgresRepository) Migrate() error {
	var err error
	var tx *sql.Tx
	if tx, err = p.db.Begin(); err != nil {
		return err
	}
	if _, err := tx.Exec(migration); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

//go:embed 000_create_tables.sql
var migration string
