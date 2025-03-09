package postgres

import (
	"context"
	"database/sql"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/repository/common"

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
		icmp_protocol,
        icmp_loss_threshold)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
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
		monitor.ICMPProtocol,
		monitor.ICMPLossThreshold)
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
	return common.NewCommonRepository(p.db).SelectMonitor(ctx, measurements, params)
}

// SelectMeasurement implements `MonitorRepository.SelectMeasurement` for `PostgresRepository`.
func (p PostgresRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	return common.NewCommonRepository(p.db).SelectMeasurement(ctx, id, params)
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
		icmp_protocol = $23,
        icmp_loss_threshold = $24
    WHERE id = $25`
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
		monitor.ICMPLossThreshold,
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
	builder := zsql.NewBuilder(zsql.NumberPositional)
	return common.NewCommonRepository(p.db).DeleteMonitor(ctx, builder, id)
}

// ToggleMonitor implements `MonitorRepository.ToggleMonitor` for `PostgresRepository`.
func (p PostgresRepository) ToggleMonitor(ctx context.Context, id []int, active bool, updatedAt internal.TimeValue) error {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	builder.PushArgs(active, updatedAt)
	builder.Advance(2)
	builder.Push(`UPDATE monitor SET active = $1, updated_at = $2 WHERE id IN (`)
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
