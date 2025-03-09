package common

import (
	"context"

	"github.com/jmkng/zenin/internal/measurement"

	zsql "github.com/jmkng/zenin/pkg/sql"
)

func (c CommonRepository) SelectCertificate(ctx context.Context, builder *zsql.Builder, id int) ([]measurement.Certificate, error) {
	builder.Push(`SELECT 
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
    WHERE measurement_id = `)
	builder.BindInt(id)

	var result []measurement.Certificate
	err := c.db.SelectContext(ctx, &result, builder.String(), builder.Args()...)
	if err != nil {
		return []measurement.Certificate{}, nil
	}

	return result, nil
}

func (c CommonRepository) DeleteMeasurement(ctx context.Context, builder *zsql.Builder, id []int) error {
	builder.Push("DELETE FROM measurement WHERE id IN (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := c.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}
