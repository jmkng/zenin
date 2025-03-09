package postgres

import (
	"fmt"
	"slices"
	"strings"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/repository"
	"github.com/jmoiron/sqlx"

	_ "embed"

	_ "github.com/jackc/pgx/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
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

	query := `SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_type = 'BASE TABLE'`

	if err := p.db.Select(&rows, query); err != nil {
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
	if _, err := p.db.Exec(migrate); err != nil {
		return fmt.Errorf("failed to migrate repository: %w", err)
	}
	return nil
}

// Fixture implements `Repository.Fixture` for `PostgresRepository`.
func (p PostgresRepository) Fixture() error {
	if _, err := p.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %v", strings.Join(repository.SchemaTables, ", "))); err != nil {
		return err
	}
	if err := p.Migrate(); err != nil {
		return err
	}
	if _, err := p.db.Exec(seed); err != nil {
		return err
	}
	return nil
}

//go:embed 000_create_tables.sql
var migrate string

//go:embed 001_seed_tables.sql
var seed string
