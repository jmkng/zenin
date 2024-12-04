package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"time"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	zsql "github.com/jmkng/zenin/pkg/sql"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `PostgresRepository`.
func (p PostgresRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	var id int
	query := `INSERT INTO monitor 
		(name,
		created_at,
		updated_at,
		kind,
		active,
		interval,
		timeout,
		description,
		remote_address,		
		remote_port,
		plugin_name,
		plugin_args,
		http_range,
		http_method,
		http_request_headers,
		http_request_body,
		http_expired_cert_mod,
		http_capture_headers,
		http_capture_body,
		icmp_size,
		icmp_wait,
		icmp_count,
		icmp_ttl,
		icmp_protocol)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    RETURNING id`
	row := tx.QueryRowContext(ctx, query,
		monitor.Name,
		monitor.CreatedAt,
		monitor.UpdatedAt,
		monitor.Kind,
		monitor.Active,
		monitor.Interval,
		monitor.Timeout,
		monitor.Description,
		monitor.RemoteAddress,
		monitor.RemotePort,
		monitor.PluginName,
		monitor.PluginArgs,
		monitor.HTTPRange,
		monitor.HTTPMethod,
		monitor.HTTPRequestHeaders,
		monitor.HTTPRequestBody,
		monitor.HTTPExpiredCertMod,
		monitor.HTTPCaptureHeaders,
		monitor.HTTPCaptureBody,
		monitor.ICMPSize,
		monitor.ICMPWait,
		monitor.ICMPCount,
		monitor.ICMPTTL,
		monitor.ICMPProtocol)
	if err = row.Scan(&id); err != nil {
		tx.Rollback()
		return 0, err
	}

	if len(monitor.Events) > 0 {
		if err = p.insertEvents(ctx, tx, id, monitor.Events); err != nil {
			tx.Rollback()
			return 0, err
		}
	}

	return id, tx.Commit()
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `PostgresRepository`.
func (p PostgresRepository) SelectMonitor(ctx context.Context, measurements int, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	if measurements > 0 {
		monitors, err = p.selectMonitorRelated(ctx, params, measurements)
	} else {
		monitors, err = p.selectMonitor(ctx, params)
	}
	if err != nil || len(monitors) == 0 {
		return []monitor.Monitor{}, err
	}

	store := make(map[int]*monitor.Monitor)
	var distinct []int

	for _, v := range monitors {
		distinct = append(distinct, *v.Id)
		store[*v.Id] = &v
	}

	var builder = zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT 
		id "event_id",
		monitor_id "event_monitor_id",
        plugin_name,
        plugin_args,
        threshold
    FROM event
    WHERE monitor_id IN (`)
	builder.SpreadInt(distinct...)
	builder.Push(") ORDER BY id DESC")

	no := []monitor.Event{}
	err = p.db.SelectContext(ctx, &no, builder.String(), builder.Args()...)
	if err != nil {
		return []monitor.Monitor{}, err
	}

	sort.Slice(no, func(i, j int) bool {
		return *no[i].Id < *no[j].Id
	})

	for _, v := range no {
		owner := store[*v.MonitorId]
		owner.Events = append(owner.Events, v)
	}

	result := []monitor.Monitor{}
	for _, v := range store {
		result = append(result, *v)
	}

	return result, err
}

func (p PostgresRepository) selectMonitor(ctx context.Context, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	var builder = zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT
            mo.id "monitor_id",
			mo.created_at,
			mo.updated_at,
            mo.name,
            mo.kind "monitor_kind",
            mo.active,
            mo.interval,
            mo.timeout,
            mo.description,
            mo.remote_address,
            mo.remote_port,
            mo.plugin_name,
            mo.plugin_args,
            mo.http_range,
            mo.http_method,
            mo.http_request_headers,
            mo.http_request_body,
            mo.http_expired_cert_mod,
			mo.http_capture_headers,
			mo.http_capture_body,
            mo.icmp_size,
			mo.icmp_wait,
			mo.icmp_count,
			mo.icmp_ttl,
			mo.icmp_protocol
        FROM monitor mo`)
	builder.Inject(params)
	builder.Push("ORDER BY mo.id;")

	err = p.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	return monitors, err
}

func (p PostgresRepository) selectMonitorRelated(ctx context.Context, params *monitor.SelectMonitorParams, measurements int) ([]monitor.Monitor, error) {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT 
		id "monitor_id",
		created_at,
		updated_at,
		name,
		kind "monitor_kind", 
		active, 
		interval, 
		timeout, 
		description, 
		remote_address, 
		remote_port, 
		plugin_name, 
		plugin_args, 
		http_range, 
		http_method, 
		http_request_headers, 
		http_request_body, 
		http_expired_cert_mod, 
		http_capture_headers, 
		http_capture_body,
		icmp_size, 
		icmp_wait, 
		icmp_count, 
		icmp_ttl, 
		icmp_protocol
	FROM monitor`)
	if params != nil {
		builder.Inject(params)
	}

	store := make(map[int]*monitor.Monitor)
	var distinct []int

	monitors := []monitor.Monitor{}
	err := p.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	if err != nil || len(monitors) == 0 {
		return []monitor.Monitor{}, err
	}

	for _, v := range monitors {
		distinct = append(distinct, *v.Id)
		store[*v.Id] = &v
	}

	builder.Reset()
	builder.Push(`WITH raw AS (SELECT
		m.*,
		ROW_NUMBER() OVER (PARTITION BY m.monitor_id ORDER BY m.created_at DESC) AS rank
	FROM measurement m   
	WHERE m.monitor_id IN (`)
	builder.SpreadInt(distinct...)
	builder.Push(`) ORDER BY m.id DESC)
	SELECT 
		id "measurement_id",
		created_at,
		updated_at,
		monitor_id "measurement_monitor_id",
		state, 
		state_hint, 
		kind "measurement_kind", 
		duration, 
		http_status_code, 
		http_response_headers, 
		http_response_body,
		icmp_packets_in, 
		icmp_packets_out, 
		icmp_min_rtt, 
		icmp_avg_rtt, 
		icmp_max_rtt,
		plugin_exit_code, 
		plugin_stdout, 
		plugin_stderr
	FROM raw WHERE rank <=`)
	builder.BindInt(measurements)

	me := []measurement.Measurement{}
	err = p.db.SelectContext(ctx, &me, builder.String(), builder.Args()...)
	if err != nil {
		return []monitor.Monitor{}, err
	}
	for _, v := range me {
		owner := store[*v.MonitorId]
		owner.Measurements = append(owner.Measurements, v)
	}

	result := []monitor.Monitor{}
	for _, v := range store {
		result = append(result, *v)
	}
	return result, nil
}

// SelectMeasurement implements `MonitorRepository.SelectMeasurement` for `PostgresRepository`.
func (p PostgresRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT
		id AS "measurement_id",
		created_at,
		updated_at,
		monitor_id AS "measurement_monitor_id",
		duration,
		state,
		state_hint,
		kind AS "measurement_kind",
		http_status_code,
		http_response_headers,
		http_response_body,
		icmp_packets_in,
		icmp_packets_out,
		icmp_min_rtt,
		icmp_avg_rtt,
		icmp_max_rtt,
		plugin_exit_code,
		plugin_stdout,
		plugin_stderr
	FROM measurement`)
	builder.Push(fmt.Sprintf("%v monitor_id = ", builder.Where()))
	builder.BindInt(id)
	if params != nil {
		builder.Inject(params)
	}
	builder.Push("ORDER BY id DESC")

	var measurements []measurement.Measurement

	err := p.db.SelectContext(ctx, &measurements, builder.String(), builder.Args()...)
	if err != nil {
		return measurements, err
	}

	return measurements, nil
}

// UpdateMonitor implements `MonitorRepository.UpdateMonitor` for `PostgresRepository`.
func (p PostgresRepository) UpdateMonitor(ctx context.Context, monitor monitor.Monitor) error {
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	const q1 string = `DELETE FROM event WHERE monitor_id = $1`
	if _, err := tx.ExecContext(ctx, q1, monitor.Id); err != nil {
		tx.Rollback()
		return err
	}

	const q2 string = `UPDATE monitor SET
        name = $1,
		updated_at = $2,
		kind = $3,
		active = $4,
		interval = $5, 
		timeout = $6, 
		description = $7,
		remote_address = $8,
		remote_port = $9,
		plugin_name = $10,
		plugin_args = $11,
		http_range = $12,
		http_method = $13,
        http_request_headers = $14,
		http_request_body = $15,
		http_expired_cert_mod = $16,
		http_capture_headers = $17,
		http_capture_body = $18,
		icmp_size = $19,
		icmp_wait = $20,
		icmp_count = $21,
		icmp_ttl = $22,
		icmp_protocol = $23
    WHERE id = $24`
	if _, err = tx.ExecContext(ctx, q2,
		monitor.Name,
		monitor.UpdatedAt,
		monitor.Kind,
		monitor.Active,
		monitor.Interval,
		monitor.Timeout,
		monitor.Description,
		monitor.RemoteAddress,
		monitor.RemotePort,
		monitor.PluginName,
		monitor.PluginArgs,
		monitor.HTTPRange,
		monitor.HTTPMethod,
		monitor.HTTPRequestHeaders,
		monitor.HTTPRequestBody,
		monitor.HTTPExpiredCertMod,
		monitor.HTTPCaptureHeaders,
		monitor.HTTPCaptureBody,
		monitor.ICMPSize,
		monitor.ICMPWait,
		monitor.ICMPCount,
		monitor.ICMPTTL,
		monitor.ICMPProtocol,
		monitor.Id); err != nil {
		tx.Rollback()
		return err
	}

	if len(monitor.Events) > 0 {
		if err := p.insertEvents(ctx, tx, *monitor.Id, monitor.Events); err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// DeleteMonitor implements `MonitorRepository.DeleteMonitor` for `PostgresRepository`.
func (p PostgresRepository) DeleteMonitor(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("DELETE FROM monitor WHERE id in (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}

// ToggleMonitor implements `MonitorRepository.ToggleMonitor` for `PostgresRepository`.
func (p PostgresRepository) ToggleMonitor(ctx context.Context, id []int, active bool, time time.Time) error {
	builder := zsql.NewBuilder(zsql.Numbered)

	builder.Push("UPDATE monitor SET active = ")
	builder.BindBool(active)
	builder.Push(", updated_at = ")
	builder.BindTime(time)
	builder.Push("WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}

func (p PostgresRepository) insertEvents(ctx context.Context, tx *sql.Tx, id int, e []monitor.Event) error {
	const q3 string = `INSERT INTO event 
        (monitor_id, plugin_name, plugin_args, threshold)
        VALUES ($1, $2, $3, $4)`

	for _, v := range e {
		if _, err := tx.ExecContext(ctx, q3, id, v.PluginName, v.PluginArgs, v.Threshold); err != nil {
			return err
		}
	}

	return nil
}
