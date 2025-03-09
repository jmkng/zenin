package postgres

import (
	"errors"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/repository/common"
	"golang.org/x/net/context"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

// InsertMeasurement implements `MeasurementRepository.InsertMeasurement` for `PostgresRepository`.
func (p PostgresRepository) InsertMeasurement(ctx context.Context, measurement measurement.Measurement) (int, error) {
	query := `INSERT INTO measurement
		(monitor_id,
		state,
		state_hint,
		kind,
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
		plugin_stderr)
    VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return -1, err
	}
	row := tx.QueryRowContext(
		ctx,
		query,
		measurement.MonitorId,
		measurement.State,
		measurement.StateHint,
		measurement.Kind,
		measurement.Duration,
		measurement.HTTPStatusCode,
		measurement.HTTPResponseHeaders,
		measurement.HTTPResponseBody,
		measurement.ICMPPacketsIn,
		measurement.ICMPPacketsOut,
		measurement.ICMPMinRTT,
		measurement.ICMPAvgRTT,
		measurement.ICMPMaxRTT,
		measurement.PluginExitCode,
		measurement.PluginStdout,
		measurement.PluginStderr,
	)
	var id int
	err = row.Scan(&id)
	if err != nil {
		return -1, errors.Join(err, tx.Rollback())
	}

	if len(measurement.Certificates) > 0 {
		builder := zsql.NewBuilder(zsql.NumberPositional)
		builder.Push(`INSERT INTO certificate
	        (measurement_id, 
			version, 
			serial_number, 
			public_key_algorithm,
	        issuer_common_name, 
			subject_common_name, 
			not_before, 
			not_after) VALUES`)
		for i, v := range measurement.Certificates {
			builder.Push("(")
			builder.SpreadOpaque(id,
				v.Version,
				v.SerialNumber,
				v.PublicKeyAlgorithm,
				v.IssuerCommonName,
				v.SubjectCommonName,
				v.NotBefore,
				v.NotAfter)
			builder.Push(")")
			if i < len(measurement.Certificates)-1 {
				builder.Push(", ")
			}
		}
		_, err = tx.ExecContext(ctx, builder.String(), builder.Args()...)
		if err != nil {
			return -1, errors.Join(err, tx.Rollback())
		}
	}

	if err := tx.Commit(); err != nil {
		return id, errors.Join(err, tx.Rollback())
	}

	return id, nil
}

// SelectCertificate implements `MeasurementRepository.SelectCertificate` for `PostgresRepository`.
func (p PostgresRepository) SelectCertificate(ctx context.Context, id int) ([]measurement.Certificate, error) {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	return common.NewCommonRepository(p.db).SelectCertificate(ctx, builder, id)
}

// DeleteMeasurement implements `MeasurementRepository.DeleteMeasurement` for `PostgresRepository`.
func (p PostgresRepository) DeleteMeasurement(ctx context.Context, id []int) error {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	return common.NewCommonRepository(p.db).DeleteMeasurement(ctx, builder, id)
}
