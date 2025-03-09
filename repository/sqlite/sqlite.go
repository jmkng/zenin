package sqlite

import (
	"fmt"
	"path/filepath"
	"slices"

	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/repository"

	"github.com/jmoiron/sqlx"

	_ "embed"

	_ "modernc.org/sqlite"
)

// NewSQLiteRepository returns a new `SQLiteRepository`.
func NewSQLiteRepository(db *env.DatabaseEnv, rt *env.RuntimeEnv) (*SQLiteRepository, error) {
	path := filepath.Join(rt.BaseDir, db.Name)

	x, err := sqlx.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	_, err = x.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}
	x.SetMaxOpenConns(int(db.MaxConn))

	return &SQLiteRepository{x}, nil
}

type SQLiteRepository struct {
	db *sqlx.DB
}

// Validate implements `Repository.Validate` for `SQLiteRepository`.
func (s SQLiteRepository) Validate() (bool, error) {
	var rows []string

	query := `SELECT name 
		FROM sqlite_master
		WHERE type = 'table' 
		AND name NOT LIKE 'sqlite_%'`

	if err := s.db.Select(&rows, query); err != nil {
		return false, err
	}
	for _, table := range repository.SchemaTables {
		if !slices.Contains(rows, table) {
			return false, nil
		}
	}

	return true, nil
}

// Migrate implements `Repository.Migrate` for `SQLiteRepository`.
func (s SQLiteRepository) Migrate() error {
	if _, err := s.db.Exec(migrate); err != nil {
		return fmt.Errorf("failed to migrate repository: %w", err)
	}
	return nil
}

// Fixture implements `Repository.Fixture` for `SQLiteRepository`.
func (s SQLiteRepository) Fixture() error {
	for _, v := range repository.SchemaTables {
		if _, err := s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %v", v)); err != nil {
			return err
		}
	}
	if err := s.Migrate(); err != nil {
		return err
	}
	if _, err := s.db.Exec(seed); err != nil {
		return err
	}
	return nil
}

//go:embed 000_create_tables.sql
var migrate string

//go:embed 001_seed_tables.sql
var seed string
