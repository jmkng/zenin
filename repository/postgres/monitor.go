package postgres

import (
	"context"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	zsql "github.com/jmkng/zenin/pkg/sql"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `PostgresRepository`.
func (p PostgresRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	var id int
	query := `INSERT INTO monitor 
		(name, kind, active, interval, timeout, description, remote_address, remote_port,
        plugin_name, plugin_args,
        http_range, http_method, http_request_headers, http_request_body, http_expired_cert_mod,
        icmp_size)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`
	row := p.db.QueryRowContext(
		ctx,
		query,
		monitor.Name,
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
		monitor.ICMPSize,
	)
	err := row.Scan(&id)
	return id, err
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `PostgresRepository`.
func (p PostgresRepository) SelectMonitor(
	ctx context.Context,
	params *monitor.SelectParams,
	measurements int,
) ([]monitor.Monitor, error) {
	if measurements > 0 {
		return p.selectMonitorRelated(ctx, params, measurements)
	}
	return p.selectMonitor(ctx, params)
}

func (p PostgresRepository) selectMonitor(ctx context.Context, params *monitor.SelectParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	var builder = zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT
            mo.id "monitor_id",
            mo.name,
            mo.kind,
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
            mo.icmp_size
        FROM monitor mo`)
	builder.Inject(params)
	builder.Push("ORDER BY mo.id;")

	err = p.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	return monitors, err
}

func (p PostgresRepository) selectMonitorRelated(ctx context.Context, params *monitor.SelectParams, measurements int) ([]monitor.Monitor, error) {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push(`SELECT 
		id "monitor_id", name, kind, active, interval, timeout, description, 
		remote_address, remote_port, 
		plugin_name, plugin_args, 
		http_range, http_method, http_request_headers, http_request_body, http_expired_cert_mod, 
		icmp_size 
	FROM monitor`)
	if params != nil {
		builder.Inject(params)
	}

	store := make(map[int]*monitor.Monitor)
	var distinct []int

	mo := []monitor.Monitor{}
	err := p.db.SelectContext(ctx, &mo, builder.String(), builder.Args()...)
	if err != nil {
		return []monitor.Monitor{}, err
	}
	for _, v := range mo {
		distinct = append(distinct, *v.Id)
		store[*v.Id] = &v
	}

	builder.Reset()
	builder.Push(`WITH raw AS (SELECT
		m.*,
		ROW_NUMBER() OVER (PARTITION BY m.monitor_id ORDER BY m.recorded_at DESC) AS rank
	FROM measurement m
	WHERE m.monitor_id IN (`)
	builder.SpreadInt(distinct...)
	builder.Push(`) ORDER BY m.id)
	SELECT 
		id "measurement_id", monitor_id "measurement_monitor_id",
		recorded_at, state, state_hint, duration, http_status_code, http_response_headers, http_response_body,
		icmp_packets_in, icmp_packets_out, icmp_min_rtt, icmp_avg_rtt, icmp_max_rtt,
		plugin_exit_code, plugin_stdout, plugin_stderr
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

func (p PostgresRepository) UpdateMonitor(ctx context.Context, monitor monitor.Monitor) error {
	const query string = `UPDATE monitor SET 
        name = $1,
        kind = $2,
        active = $3,
        interval = $4,
        timeout = $5,
        description = $6,
        remote_address = $7,
        remote_port = $8,
        plugin_name = $9,
        plugin_args = $10,
        http_range = $11,
        http_method = $12,
        http_request_headers = $13,
        http_request_body = $14,
        http_expired_cert_mod = $15,
        icmp_size = $16
    WHERE id = $17`
	_, err := p.db.ExecContext(ctx, query,
		monitor.Name,
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
		monitor.ICMPSize,
		monitor.Id)
	return err
}

func (p PostgresRepository) DeleteMonitor(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("DELETE FROM monitor WHERE id in (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}

func (p PostgresRepository) ToggleMonitor(ctx context.Context, id []int, active bool) error {
	builder := zsql.NewBuilder(zsql.Numbered)
	builder.Push("UPDATE monitor SET active = ")
	builder.BindBool(active)
	builder.Push("WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := p.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}
