package monitor

import (
	"context"
	"fmt"
	"time"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/pkg/sql"
)

// MonitorRepository is a type used to interact with the monitor domain
// database table.
type MonitorRepository interface {
	InsertMonitor(ctx context.Context, monitor Monitor) (int, error)
	SelectMonitor(ctx context.Context, measurements int, params *SelectMonitorParams) ([]Monitor, error)
	SelectMeasurement(ctx context.Context, id int, params *SelectMeasurementParams) ([]measurement.Measurement, error)
	UpdateMonitor(ctx context.Context, monitor Monitor) error
	DeleteMonitor(ctx context.Context, id []int) error
	ToggleMonitor(ctx context.Context, id []int, active bool, time time.Time) error
}

// SelectMonitorParams is a set of parameters used to narrow the scope of the `SelectMonitor`
// repository method.
//
// If the `Id` property is not nil, it will take priority over all other parameters.
// Otherwise, all parameters that are not nil are applied to the query.
//
// Implements `Injectable.Inject`, so it can automatically apply suitable SQL to
// a `sql.Builder`.
type SelectMonitorParams struct {
	// Group 1 -----

	Id *[]int

	// Group 2 -----

	Active *bool
	Kind   *measurement.ProbeKind
}

// Inject implements `Injectable.Inject` for `SelectMonitorParams`.
func (s SelectMonitorParams) Inject(builder *sql.Builder) {
	if s.Id != nil && len(*s.Id) > 0 {
		builder.Push(fmt.Sprintf("%v id IN (", builder.Where()))
		builder.SpreadInt(*s.Id...)
		builder.Push(")")
		return
	}
	where := builder.Where()
	if s.Active != nil {
		x := fmt.Sprintf("%v ACTIVE = ", where)
		builder.Push(x)
		builder.BindBool(*s.Active)
	}
	if s.Kind != nil {
		x := fmt.Sprintf("%v KIND = ", where)
		kind := string(*s.Kind)
		builder.Push(x)
		builder.BindString(kind)
	}
}

// SelectMeasurementParams is a set of parameters used to narrow the scope of the `SelectMeasurement`
// repository method.
//
// Implements `Injectable.Inject`, so it can automatically apply suitable SQL to
// a `sql.Builder`.
type SelectMeasurementParams struct {
	After  *time.Time
	Before *time.Time
}

// Inject implements `Injectable.Inject` for `SelectMeasurementParams`.
func (s SelectMeasurementParams) Inject(builder *sql.Builder) {
	where := builder.Where()
	if s.After != nil {
		builder.Push(fmt.Sprintf("%v created_at > ", where))
		builder.BindString(s.After.Format(time.RFC3339))
	}
	if s.Before != nil {
		builder.Push(fmt.Sprintf("%v created_at < ", where))
		builder.BindString(s.Before.Format(time.RFC3339))
	}
}
