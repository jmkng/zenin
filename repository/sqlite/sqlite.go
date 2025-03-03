package sqlite

import (
	"database/sql"
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
func (p SQLiteRepository) Migrate() error {
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
