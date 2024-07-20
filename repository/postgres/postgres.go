package postgres

import (
	"database/sql"
	_ "embed"
	"fmt"
	"slices"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/repository"

	_ "github.com/jackc/pgx/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

// NewPostgresRepository returns a new `PostgresRepository`.
func NewPostgresRepository(env *env.DatabaseEnv) (*PostgresRepository, error) {
	conns := fmt.Sprintf("postgres://%v:%v@%v:%v/%v",
		env.Username,
		env.Password,
		env.Host,
		env.Port,
		env.Name)
	db, err := sqlx.Open("pgx", conns)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(int(env.MaxConn))
	return &PostgresRepository{db}, nil
}

type PostgresRepository struct {
	db *sqlx.DB
}

// Validate implements `Repository.Validate` for `PostgresRepository`.
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

// Migrate implements `Repository.Migrate` for `PostgresRepository`.
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
