package zenin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jmkng/zenin/probe"
)

type Measurement struct {
	CreateMeasurement

	ID        int64
	CreatedAt time.Time
	UpdatedAt time.Time
}

type MeasurementService struct {
	r MeasurementRepository
}

type GetMeasurementOpts struct {
	// Return measurements by ID.
	ID []int64

	// Options that facilitate selecting measurements
	// which are related to a subset of monitors.
	Related RelatedTarget

	// Return measurements created before a [time.Time].
	Before time.Time
	// Return measurements created after a [time.Time].
	After time.Time

	// Sort ascending.
	CreatedAtAsc bool
}

type RelatedTarget struct {
	// Return measurements by related monitor ID.
	MonitorID []int64
	// Limit the number of measurements returned per monitor.
	// Ignored if MonitorID is empty.
	Limit int
	// Sort groups ascending.
	// Ignored if MonitorID is empty.
	CreatedAtAsc bool
}

// Get returns the measurements that match [GetMeasurementOpts],
// or all measurements when zero value.
func (m MeasurementService) Get(ctx context.Context, o GetMeasurementOpts) ([]Measurement, error) {
	// Zero values of "*Opts" type structs are always valid.
	// No need to validate anything, just hand it to the repository.

	me, err := m.r.Get(ctx, o)
	if err != nil {
		return []Measurement{},
			fmt.Errorf("measurement service: getting measurements: %w", err)
	}
	return me, nil

}

// CreateMeasurement contains [probe.Output] and additional execution details.
// Used to create a new [Measurement].
type CreateMeasurement struct {
	probe.Output

	// Associated monitor ID.
	MonitorID int64
	// Execution time.
	Duration time.Duration
	// Identifies the probe that was invoked to generate the output.
	ProbeID probe.ID
}

// Validate returns [MeasurementInvalidError] when c is invalid.
func (c CreateMeasurement) Validate() error {
	var me MeasurementInvalidError

	// MonitorID is invalid when it doesn't match a monitor,
	// but that can't be done here because it requires a repository call.

	if c.Duration <= 0 {
		me.Duration = "Duration must be a positive, non-zero integer."
	}
	if !probe.IsValidID(c.ProbeID) {
		me.ProbeID = "Probe ID must be 1." // TODO: This will change as probes are re-implemented.
	}
	if !probe.IsValidState(c.State) {
		me.State = "State must be 1 (Ok), 2 (Warn), or 3 (Dead)."
	}

	if me == (MeasurementInvalidError{}) {
		return nil
	}
	return me

}

// MeasurementInvalidError contains messages for invalid measurement fields.
type MeasurementInvalidError struct {
	State      string
	Hints      string
	Attributes string
	MonitorID  string
	Duration   string
	ProbeID    string
}

func (m MeasurementInvalidError) Error() string {
	return "measurement invalid"
}

// Suffix "params" is introduced here because the zero value of this struct
// is not considered valid.

type DeleteMeasurementParams struct {
	DeleteMeasurementOpts

	// Allow truncation of table.
	AllowTruncate bool
}

// Needed for a safety check in [MeasurementService.Delete].
// We shouldn't allow a zero-value [DeleteMeasurementParams] through that service method
// without explicit permission to truncate.

func (d DeleteMeasurementParams) isDangerousDelete() bool {
	return len(d.ID) == 0 && len(d.MonitorID) == 0 &&
		d.Before.IsZero() && d.After.IsZero()
}

var ErrTruncateNotAllowed = errors.New("truncate not allowed")

func (m MeasurementService) Delete(ctx context.Context, p DeleteMeasurementParams) error {
	if p.isDangerousDelete() && !p.AllowTruncate {
		return ErrTruncateNotAllowed
	}

	err := m.r.Delete(ctx, DeleteMeasurementOpts{
		ID:        p.ID,
		MonitorID: p.MonitorID,
		Before:    p.Before,
		After:     p.After,
	})
	if err != nil {
		return fmt.Errorf("measurement service: deleting measurements: %w", err)
	}
	return nil
}

type DeleteMeasurementOpts struct {
	// Delete measurements by ID.
	ID []int64
	// Delete measurements by related monitor ID.
	MonitorID []int

	// Delete measurements created before a [time.Time]
	Before time.Time
	// Delete measurements created after a [time.Time]
	After time.Time
}

type MeasurementRepository interface {
	// Create will create a new measurement described by [CreateMeasurement].
	// The time is the created/updated time.
	//
	// Returns the ID of the new measurement.
	Create(ctx context.Context, t time.Time, c CreateMeasurement) (int64, error)
	// Not exposed in service. Required by test suite.

	// Get returns the measurements that match [GetMeasurementOpts],
	// or all measurements when zero value.
	Get(ctx context.Context, o GetMeasurementOpts) ([]Measurement, error)
	// GetMonitorID returns the IDs of monitors that match id.
	GetMonitorID(ctx context.Context, id []int64) ([]int64, error)

	// Delete will delete the measurements that match [DeleteMeasurementOpts].
	Delete(ctx context.Context, o DeleteMeasurementOpts) error
}
