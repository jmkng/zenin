package postgres

import (
	"context"
	"fmt"

	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/pkg/sql"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `PostgresRepository`.
func (p PostgresRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	var id int
	query := `
		INSERT INTO monitor 
		(name, kind, active, interval, timeout, description, remote_address, remote_port,
        script_path, 
        http_range, http_method, http_request_headers, http_request_body, http_expired_cert_mod,
        icmp_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id
	`
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
		monitor.ScriptPath,
		monitor.HTTPRange,
		monitor.HTTPMethod,
		monitor.HTTPHeaders,
		monitor.HTTPBody,
		monitor.HTTPExpiredCertMod,
		monitor.ICMPSize,
	)
	err := row.Scan(&id)
	if err != nil {
		return id, fmt.Errorf("failed to insert monitor: %w", err)
	}
	return id, nil
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `PostgresRepository`.
func (p PostgresRepository) SelectMonitor(
	ctx context.Context,
	params *monitor.SelectParams,
	measurements int,
) ([]monitor.MonitorJSON, error) {
	if measurements > 0 {
		return p.selectMonitorRelated(ctx, params, measurements)
	}
	return p.selectMonitor(ctx, params)
}

// selectMonitor returns monitors based on the provided `SelectParams`.
func (p PostgresRepository) selectMonitor(ctx context.Context, params *monitor.SelectParams) ([]monitor.MonitorJSON, error) {
	var monitors []monitor.MonitorJSON
	var err error

	var builder = sql.NewBuilder(sql.Numbered)
	builder.Push(`SELECT
            mo.id,
            mo.name,
            mo.kind,
            mo.active,
            mo.interval,
            mo.timeout,
            mo.description,
            mo.remote_address,
            mo.remote_port,
            mo.script_path,
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

// selectMonitorRelated returns monitors based on the provided `SelectParams`.
// If `measurements > 0` the `JSON` field of the returned `MonitorJSON` will be populated
// with a JSON string containing that many measurements at most.
func (p PostgresRepository) selectMonitorRelated(
	ctx context.Context,
	params *monitor.SelectParams,
	measurements int,
) ([]monitor.MonitorJSON, error) {
	var monitors []monitor.MonitorJSON
	var err error

	var builder = sql.NewBuilder(sql.Numbered)
	builder.Push("WITH mo AS (SELECT * FROM monitor")
	builder.Inject(params)
	builder.Push(`), ms AS (
        SELECT
            m.*,
            ROW_NUMBER() OVER (PARTITION BY m.monitor_id ORDER BY m.recorded_at DESC) AS rnk
        FROM measurement m
        WHERE m.monitor_id IN (SELECT id FROM mo)
        ORDER BY m.id
    ), filtered_ms AS (
        SELECT * 
        FROM ms
        WHERE rnk <=`)
	builder.BindInt(measurements)
	builder.Push(`), aggregated_ms AS (
        SELECT
            monitor_id,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'recordedAt', recorded_at,
                'state', state,
                'stateHint', state_hint,
                'duration', duration,
                'httpStatusCode', http_status_code,
                'httpResponseHeaders', http_response_headers,
                'httpResponseBody', http_response_body,
                'icmpPacketsIn', icmp_packets_in,
                'icmpPacketsOut', icmp_packets_out,
                'icmpMinRtt', icmp_min_rtt,
                'icmpAvgRtt', icmp_avg_rtt,
                'icmpMaxRtt', icmp_max_rtt,
                'scriptExitCode', script_exit_code,
                'scriptStdout', script_stdout,
                'scriptStderr', script_stderr,
                'certificates', (
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', c.id,
                        'version', c.version,
                        'serialNumber', c.serial_number,
                        'publicKeyAlgorithm', c.public_key_algorithm,
                        'issuerCommonName', c.issuer_common_name,
                        'subjectCommonName', c.subject_common_name,
                        'notBefore', c.not_before,
                        'notAfter', c.not_after
                    ))
                    FROM certificate c
                    WHERE c.measurement_id = ms.id
                )
            )) AS measurements
        FROM filtered_ms ms
        GROUP BY monitor_id)

        SELECT
        mo.id,
        mo.name,
        mo.kind,
        mo.active,
        mo.interval,
        mo.timeout,
        mo.description,
        mo.remote_address,
        mo.remote_port,
        mo.script_path,
        mo.http_range,
        mo.http_method,
        mo.http_request_headers,
        mo.http_request_body,
        mo.http_expired_cert_mod,
        mo.icmp_size,
        am.measurements "measurements_json"
    FROM mo
    LEFT JOIN aggregated_ms am ON mo.id = am.monitor_id
    ORDER BY mo.id;`)

	err = p.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	return monitors, err
}
