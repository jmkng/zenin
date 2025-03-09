package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/repository/common"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

// InsertMonitor implements `MonitorRepository.InsertMonitor` for `SQLiteRepository`.
func (s SQLiteRepository) InsertMonitor(ctx context.Context, monitor monitor.Monitor) (int, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

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
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	result, err := tx.ExecContext(ctx, query,
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
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	id64, err := result.LastInsertId()
	if err != nil {
		tx.Rollback()
		return 0, fmt.Errorf("failed to get insert id: %w", err)
	}
	id := int(id64)

	if len(monitor.Events) > 0 {
		if err = s.insertEvents(ctx, tx, id, monitor.Events); err != nil {
			tx.Rollback()
			return 0, err
		}
	}

	return id, tx.Commit()
}

// SelectMonitor implements `MonitorRepository.SelectMonitor` for `SQLiteRepository`.
func (s SQLiteRepository) SelectMonitor(ctx context.Context, measurements int, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	return common.NewCommonRepository(s.db).SelectMonitor(ctx, measurements, params)
}

// SelectMeasurement implements `MonitorRepository.SelectMeasurement` for `SQLiteRepository`.
func (s SQLiteRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	return common.NewCommonRepository(s.db).SelectMeasurement(ctx, id, params)
}

// UpdateMonitor implements `MonitorRepository.UpdateMonitor` for `SQLiteRepository`.
func (s SQLiteRepository) UpdateMonitor(ctx context.Context, monitor monitor.Monitor) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	const q1 string = `DELETE FROM event WHERE monitor_id = ?`
	if _, err := tx.ExecContext(ctx, q1, monitor.Id); err != nil {
		tx.Rollback()
		return err
	}

	const q2 string = `UPDATE monitor SET
        name = ?,
		updated_at = ?,
		kind = ?,
		active = ?,
		interval = ?, 
		timeout = ?, 
		description = ?,
		remote_address = ?,
		remote_port = ?,
		plugin_name = ?,
		plugin_args = ?,
		http_range = ?,
		http_method = ?,
        http_request_headers = ?,
		http_request_body = ?,
		http_expired_cert_mod = ?,
		http_capture_headers = ?,
		http_capture_body = ?,
		icmp_size = ?,
		icmp_wait = ?,
		icmp_count = ?,
		icmp_ttl = ?,
		icmp_protocol = ?,
        icmp_loss_threshold = ?
    WHERE id = ?`
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
		if err := s.insertEvents(ctx, tx, *monitor.Id, monitor.Events); err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// DeleteMonitor implements `MonitorRepository.DeleteMonitor` for `SQLiteRepository`.
func (s SQLiteRepository) DeleteMonitor(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	return common.NewCommonRepository(s.db).DeleteMonitor(ctx, builder, id)
}

// ToggleMonitor implements `MonitorRepository.ToggleMonitor` for `SQLiteRepository`.
func (s SQLiteRepository) ToggleMonitor(ctx context.Context, id []int, active bool, updatedAt internal.TimeValue) error {
	builder := zsql.NewBuilder(zsql.QuestionPositional)
	builder.PushArgs(active, updatedAt)
	builder.Push(`UPDATE monitor SET active = ?, updated_at = ? WHERE id IN (`)
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := s.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}

func (s SQLiteRepository) insertEvents(ctx context.Context, tx *sql.Tx, id int, e []monitor.Event) error {
	const q3 string = `INSERT INTO event 
        (monitor_id, plugin_name, plugin_args, threshold)
        VALUES (?, ?, ?, ?)`
	for _, v := range e {
		if _, err := tx.ExecContext(ctx, q3, id, v.PluginName, v.PluginArgs, v.Threshold); err != nil {
			return err
		}
	}

	return nil
}
