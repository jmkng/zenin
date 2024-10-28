package postgres

import (
	"errors"

	"github.com/jmkng/zenin/internal/measurement"
	zsql "github.com/jmkng/zenin/pkg/sql"
	"golang.org/x/net/context"
)

// InsertMeasurement implements `MeasurementRepository.InsertMeasurement` for `PostgresRepository`.
func (p PostgresRepository) InsertMeasurement(ctx context.Context, measurement measurement.Measurement) (int, error) {
	var id int
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
		return id, err
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
	err = row.Scan(&id)
	if err != nil {
		rberr := tx.Rollback()
		return id, errors.Join(err, rberr)
	}

	if len(measurement.Certificates) > 0 {
		builder := zsql.NewBuilder(zsql.Numbered)
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
			rberr := tx.Rollback()
			return id, errors.Join(err, rberr)
		}
	}

	err = tx.Commit()
	if err != nil {
		rberr := tx.Rollback()
		return id, errors.Join(err, rberr)
	}

	return id, err
}

// SelectCertificate implements `MeasurementRepository.SelectCertificate` for `PostgresRepository`.
func (p PostgresRepository) SelectCertificate(ctx context.Context, id int) ([]measurement.Certificate, error) {
	query := `SELECT 
        id "certificate_id", 
		created_at,
		updated_at,
		measurement_id "certificate_measurement_id",  
		version, 
		serial_number, 
        public_key_algorithm, 
		issuer_common_name, 
		subject_common_name, 
		not_before, 
		not_after
    FROM certificate
    WHERE measurement_id = $1`

	var result []measurement.Certificate
	err := p.db.SelectContext(ctx, &result, query, id)
	if err != nil {
		return []measurement.Certificate{}, nil
	}

	return result, nil
}
