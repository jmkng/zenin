package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jmkng/zenin"
	zjson "github.com/jmkng/zenin/internal/json"
	zsql "github.com/jmkng/zenin/internal/sql"
)

type MeasurementRepository struct {
	db *sql.DB
}

func (m MeasurementRepository) Create(ctx context.Context, t time.Time, o zenin.CreateMeasurement) (int64, error) {
	attr := zjson.MarshalAttributes(o.Attributes)

	time := NewUTCTime(t)
	q := `INSERT INTO measurement (
		created_at
		,updated_at
		,monitor_id
		,probe_id
		,state
		,hints_json
		,duration_ns
		,attributes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	result, err := m.db.ExecContext(
		ctx,
		q,
		time,
		time,
		o.MonitorID,
		o.ProbeID,
		o.State,
		zjson.Slice[string](o.Hints),
		o.Duration,
		attr,
	)
	if err != nil {
		return 0, fmt.Errorf("sqlite: creating measurement: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("sqlite: getting id: %w", err)
	}

	return id, nil
}

func (m MeasurementRepository) Get(ctx context.Context, o zenin.GetMeasurementOpts) ([]zenin.Measurement, error) {
	ranked := o.Related.Limit > 0
	b := newBuilder()
	if ranked {
		// Used to grab x measurements per monitor.
		b.Push(`WITH ranked AS (SELECT
			m.*
			,ROW_NUMBER() OVER (PARTITION BY m.monitor_id ORDER BY m.created_at`)
		if o.Related.CreatedAtAsc {
			b.Push("ASC")
		} else {
			b.Push("DESC")
		}
		b.Push(`) "rank" FROM measurement m`)
		if len(o.Related.MonitorID) > 0 {
			zsql.In(b.Where(), "m.monitor_id", o.Related.MonitorID...)
		}
		b.Push(")")
	}

	b.Push(`SELECT
		id
		,created_at
		,updated_at
		,monitor_id
		,probe_id
		,state
		,hints_json
		,duration_ns
		,attributes_json
	FROM`)
	w := b.Where()
	if ranked {
		b.Push("ranked")
		w.ExprBind("rank", zsql.OpLessEqual, o.Related.Limit)
	} else {
		b.Push("measurement")
	}

	if len(o.ID) > 0 {
		zsql.In(w, "id", o.ID...)
	}
	// No need when ranked, already filtered by CTE.
	if len(o.Related.MonitorID) > 0 && !ranked {
		zsql.In(w, "monitor_id", o.Related.MonitorID...)
	}

	if !o.Before.IsZero() {
		w.ExprBind("created_at", zsql.OpLess, NewUTCTime(o.Before))
	}
	if !o.After.IsZero() {
		w.ExprBind("created_at", zsql.OpGreater, NewUTCTime(o.After))
	}

	query := b.String()
	rows, err := m.db.QueryContext(ctx, query, b.Args()...)
	if err != nil {
		return nil, fmt.Errorf("sqlite: querying measurement rows: %w", err)
	}
	defer rows.Close()

	var results []zenin.Measurement
	for rows.Next() {
		var (
			mm        zenin.Measurement
			createdAt Time
			updatedAt Time
			hints     zjson.Slice[string]
			attrJSON  []byte
		)

		err := rows.Scan(
			&mm.ID,
			&createdAt,
			&updatedAt,
			&mm.MonitorID,
			&mm.ProbeID,
			&mm.State,
			&hints,
			&mm.Duration,
			&attrJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("sqlite: scanning measurement row: %w", err)
		}

		mm.CreatedAt = createdAt.time
		mm.UpdatedAt = updatedAt.time
		mm.Hints = hints
		mm.Output.Attributes, err = zjson.UnmarshalAttributes(mm.ProbeID, attrJSON)
		if err != nil {
			return nil, fmt.Errorf("sqlite: unmarshaling attributes: %w", err)
		}

		results = append(results, mm)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("sqlite: measurement rows error: %w", err)
	}

	return results, nil
}

func (m MeasurementRepository) GetMonitorID(ctx context.Context, id []int64) ([]int64, error) {
	b := newBuilder()
	b.Push(`SELECT id FROM monitor`)
	zsql.In(b.Where(), "id", id...)

	rows, err := m.db.QueryContext(ctx, b.String(), b.Args()...)
	if err != nil {
		return []int64{}, fmt.Errorf("sqlite: querying monitor ids: %w", err)
	}
	defer rows.Close()

	existing := make([]int64, 0, len(id))
	for rows.Next() {
		var id int64
		err := rows.Scan(&id)
		if err != nil {
			return []int64{}, fmt.Errorf("sqlite: scanning monitor id row: %w", err)
		}
		existing = append(existing, id)
	}
	if rows.Err() != nil {
		return []int64{}, fmt.Errorf("sqlite: monitor id rows error: %w", err)
	}

	return existing, nil
}

func (m MeasurementRepository) Delete(ctx context.Context, o zenin.DeleteMeasurementOpts) error {
	b := newBuilder()
	b.Push("DELETE FROM measurement")

	w := b.Where()
	if len(o.ID) > 0 {
		zsql.In(w, "id", o.ID...)
	}
	if len(o.MonitorID) > 0 {
		zsql.In(w, "monitor_id", o.MonitorID...)
	}

	if !o.Before.IsZero() {
		w.ExprBind("created_at", zsql.OpLess, NewUTCTime(o.Before))
	}
	if !o.After.IsZero() {
		w.ExprBind("created_at", zsql.OpGreater, NewUTCTime(o.After))
	}

	_, err := m.db.ExecContext(ctx, b.String(), b.Args()...)
	if err != nil {
		return fmt.Errorf("sqlite: deleting measurement: %w", err)
	}
	return nil
}
