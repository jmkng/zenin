package postgres

import (
	"errors"

	"github.com/jmkng/zenin/internal/measurement"
	zsql "github.com/jmkng/zenin/pkg/sql"
	"golang.org/x/net/context"
)

func (p PostgresRepository) InsertMeasurement(ctx context.Context, m measurement.Measurement) (int, error) {
	var id int
	query := `INSERT INTO measurement 
		(monitor_id, recorded_at, state, duration, 
        http_status_code, http_response_headers, http_response_body,
        icmp_packets_in, icmp_packets_out, icmp_min_rtt, icmp_avg_rtt, icmp_max_rtt,
        script_exit_code, script_stdout, script_stderr)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id`
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return id, err
	}
	row := tx.QueryRowContext(
		ctx,
		query,
		m.MonitorId,
		m.RecordedAt,
		m.State,
		m.Duration,
		m.HTTPStatusCode,
		m.HTTPResponseHeaders,
		m.HTTPResponseBody,
		m.ICMPPacketsIn,
		m.ICMPPacketsOut,
		m.ICMPMinRTT,
		m.ICMPAvgRTT,
		m.ICMPMaxRTT,
		m.ScriptExitCode,
		m.ScriptStdout,
		m.ScriptStderr,
	)
	err = row.Scan(&id)
	if err != nil {
		rberr := tx.Rollback()
		return id, errors.Join(err, rberr)
	}

	if len(m.Certificates) > 0 {
		builder := zsql.NewBuilder(zsql.Numbered)
		builder.Push(`INSERT INTO certificate
	        (measurement_id, version, serial_number, public_key_algorithm,
	        issuer_common_name, subject_common_name, not_before, not_after) VALUES`)
		for i, v := range m.Certificates {
			builder.Push("(")
			builder.SpreadOpaque(id, v.Version, v.SerialNumber, v.PublicKeyAlgorithm, v.IssuerCommonName,
				v.SubjectCommonName, v.NotBefore, v.NotAfter)
			builder.Push(")")
			if i < len(m.Certificates)-1 {
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