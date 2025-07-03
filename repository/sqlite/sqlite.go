package sqlite

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"slices"

	"github.com/jmkng/zenin"
	zsql "github.com/jmkng/zenin/internal/sql"

	_ "modernc.org/sqlite"
)

// TODO
// Handle db-specific errors this time.
//if driverErr, ok := err.(*mysql.MySQLError); ok {
//	if driverErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
//		// Handle the permission-denied error
//	}
//}

type Opts struct {
	// Maximum open database connections.
	// Default is 5.
	MaxConn    int
	DisableWAL bool
}

// ErrWALNotSupported is returned when WAL mode is requested but failed to activate.
// This may indicate the system does not support it.
// See SQLite documentation for details. https://www.sqlite.org/wal.html
var ErrWALNotSupported = errors.
	New("switch to WAL journal mode failed: system may not support it")

// New returns a new [SQLite] repository.
// It is ready to use. Close it with [SQLite.Close].
//
// If the repository is missing expected tables,
// a migration is attempted.
func New(path string, o Opts) (*SQLite, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("sqlite: opening repository: %w", err)
	}

	mc := o.MaxConn
	if mc == 0 {
		mc = 5
	}
	db.SetMaxOpenConns(mc)

	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return nil, fmt.Errorf("sqlite: enabling foreign keys: %w", err)
	}

	if !o.DisableWAL {
		var mode string
		err := db.QueryRow("PRAGMA journal_mode = WAL;").Scan(&mode)
		if err != nil {
			return nil, fmt.Errorf("sqlite: querying journal mode: %w", err)
		}
		if mode != "wal" {
			return nil, fmt.Errorf("sqlite: setting WAL journal mode: %w", ErrWALNotSupported)
		}
	}

	if err := migrate(db); err != nil {
		return nil, err
	}

	return &SQLite{
		db: db,

		//mo:      MonitorRepository{db},

		me: MeasurementRepository{db},

		//ac:      accountRepository{db},
		//se:      settingsRepository{db},
	}, nil
}

type SQLite struct {
	db *sql.DB

	//mo MonitorRepository

	me MeasurementRepository

	//ac AccountRepository
	//se SettingsRepository
}

func migrate(db *sql.DB) error {
	entries, _ := migrationFS.ReadDir("migrations")
	slices.SortFunc(entries, func(a, b fs.DirEntry) int {
		if a.Name() < b.Name() {
			return -1
		} else if a.Name() > b.Name() {
			return 1
		}
		return 0
	})

	if len(entries) == 0 {
		panic("sqlite: no migrations found")
	}

	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS migration (
		created_at TEXT NOT NULL,
		version    TEXT NOT NULL CHECK (version <> '')
	);`)
	if err != nil {
		return fmt.Errorf("sqlite: creating migration table: %w", err)
	}

	rows, err := db.Query("SELECT version FROM migration ORDER BY version")
	if err != nil {
		return fmt.Errorf("sqlite: reading migration versions: %w", err)
	}
	defer rows.Close()

	var versions []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return fmt.Errorf("sqlite: scanning migration version: %w", err)
		}
		versions = append(versions, v)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("sqlite: migration row error: %w", err)
	}

	for _, entry := range entries {
		name := entry.Name()
		if slices.Contains(versions, name) {
			continue
		}
		bytes, err := migrationFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("sqlite: reading %q migration file: %w", name, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("sqlite: starting %q migration transaction: %w", name, err)
		}
		if _, err := tx.Exec(string(bytes)); err != nil {
			tx.Rollback()
			return fmt.Errorf("executing %q migration file: %w", name, err)
		}
		if _, err := tx.Exec("INSERT INTO migration (version) VALUES (?)", name); err != nil {
			tx.Rollback()
			return fmt.Errorf("sqlite: writing %q migration version: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("sqlite: committing %q migration: %w", name, err)
		}
	}

	return nil
}

// Close will close the database.
// It prevents new queries from starting, and then waits for existing queries to finish.
func (s SQLite) Close() error {
	err := s.db.Close()
	if err != nil {
		return fmt.Errorf("sqlite: closing repository: %w", err)
	}
	return nil
}

//func (s SQLite) Monitor() zenin.MonitorRepository {
//	return &s.mo
//}

func (s SQLite) Measurement() zenin.MeasurementRepository {
	return s.me
}

func newBuilder() *zsql.Builder {
	return zsql.NewBuilder(zsql.MarkerQuestion)
}

//go:embed migrations/*.sql
var migrationFS embed.FS
