package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/pkg/sql"
)

// MonitorRelatedJSONRow is a `Monitor` that may have a chunk of JSON containing
// related measurements.
//
// Implements a `Measurements` method that will attempt to unmarshal it.
type MonitorRelatedJSONRow struct {
	monitor.Monitor
	MeasurementsJSON *string `db:"measurements_json"`
}

// Measurements will attempt to unmarshal the data stored in `MeasurementsJSON`.
//
// Returns an error on failure, or when it is a nil pointer.
func (m *MonitorRelatedJSONRow) Measurements() ([]measurement.Measurement, error) {
	var measurements []measurement.Measurement
	if m.MeasurementsJSON == nil {
		return measurements, errors.New("no measurements")
	}
	a := *m.MeasurementsJSON
	fmt.Printf("%v\n\n", a)
	err := json.Unmarshal([]byte(*m.MeasurementsJSON), &measurements)
	if err != nil {
		return nil, err
	}
	return measurements, nil
}

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

func (p PostgresRepository) SelectMonitor(ctx context.Context, params *monitor.SelectParams, measurements int) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	var builder = sql.NewBuilder(sql.Numbered)

	if measurements == 0 {
		panic("todo")
	} else {
		p.selectMonitorRelated(builder, params, measurements)
		var temp []MonitorRelatedJSONRow
		err = p.db.SelectContext(ctx, &temp, builder.String(), builder.Args()...)
		if err != nil {
			return monitors, err
		}
		for _, v := range temp {
			monitor := v.Monitor
			if v.MeasurementsJSON != nil {
				measurements, err := v.Measurements()
				if err != nil {
					return monitors, fmt.Errorf("database returned unrecognized json for related measurements: %w", err)
				}
				monitor.Measurements = measurements
			}
			monitors = append(monitors, monitor)
		}
	}

	return monitors, err
}

func (p PostgresRepository) selectMonitor(builder *sql.Builder, params *monitor.SelectParams) {
	panic("todo")
}

func (p PostgresRepository) selectMonitorRelated(builder *sql.Builder, params *monitor.SelectParams, measurements int) {
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
}
