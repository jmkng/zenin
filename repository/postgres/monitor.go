package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	zsql "github.com/jmkng/zenin/pkg/sql"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `PostgresRepository`.
func (p PostgresRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	var id int
	query := `INSERT INTO monitor 
		(name, kind, active, interval, timeout, description, remote_address, remote_port,
        script_path, 
        http_range, http_method, http_request_headers, http_request_body, http_expired_cert_mod,
        icmp_size)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
		monitor.ScriptPath,
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

// selectMonitor returns monitors based on the provided `SelectParams`.
func (p PostgresRepository) selectMonitor(ctx context.Context, params *monitor.SelectParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	var builder = zsql.NewBuilder(zsql.Numbered)
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

// monitorJSON is a `Monitor` that may have a chunk of JSON containing
// related measurements.
type monitorJSON struct {
	monitor.Monitor
	JSON *string `json:"measurements" db:"measurements_json"`
}

// selectMonitorRelated returns monitors based on the provided `SelectParams`.
// If `measurements > 0` the `JSON` field of the returned `MonitorJSON` will be populated
// with a JSON string containing that many measurements at most.
func (p PostgresRepository) selectMonitorRelated(
	ctx context.Context,
	params *monitor.SelectParams,
	measurements int,
) ([]monitor.Monitor, error) {
	var temp []monitorJSON
	var err error

	var builder = zsql.NewBuilder(zsql.Numbered)
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
                'monitorId', monitor_id,
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
                        'measurementId', measurement_id,
                        'version', c.version,
                        'serialNumber', c.serial_number,
                        'publicKeyAlgorithm', c.public_key_algorithm,
                        'issuerCommonName', c.issuer_common_name,
                        'subjectCommonName', c.subject_common_name,
                        'notBefore', c.not_before,
                        'notAfter', c.not_after
                    ) ORDER BY c.id ASC)
                    FROM certificate c
                    WHERE c.measurement_id = ms.id
                )
            ) ORDER BY id DESC) AS measurements
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
	err = p.db.SelectContext(ctx, &temp, builder.String(), builder.Args()...)

	monitors := []monitor.Monitor{}
	for _, v := range temp {
		monitor := v.Monitor
		if v.JSON != nil {
			measurements := []measurement.Measurement{}
			if err := json.Unmarshal([]byte(*v.JSON), &measurements); err != nil {
				return monitors, fmt.Errorf("failed to unwrap related measurements for monitor `%v`: %w", v.Id, err)
			}
			monitor.Measurements = measurements
		}
		monitors = append(monitors, monitor)
	}

	return monitors, err
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
        script_path = $9,
        http_range = $10,
        http_method = $11,
        http_request_headers = $12,
        http_request_body = $13,
        http_expired_cert_mod = $14,
        icmp_size = $15
    WHERE id = $16`
	_, err := p.db.ExecContext(ctx, query,
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
