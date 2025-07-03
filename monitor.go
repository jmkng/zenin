package zenin

import (
	"context"
	"time"

	"github.com/jmkng/zenin/probe"
)

type Tag struct {
	ID        int64
	CreatedAt time.Time
	UpdatedAt time.Time
	Name      string
}

type Monitor struct {
	ID        int64
	CreatedAt time.Time
	UpdatedAt time.Time
	// Display name.
	// Must never be empty.
	Name        string
	Description string
	// True when the monitor is being polled.
	Active bool
	// Tag memberships.
	Tags []Tag
	// Equipped probe.
	// Equip.Valid is false when unequipped.
	Equip Optional[Equip]
}

type Equip struct {
	// Identifies the probe that the monitor will use for polling.
	ProbeID probe.ID
	// An implementation of [probe.Poller].
	// Contains the parameters needed to execute a poll.
	Probe probe.Poller
	// Time delay between polls.
	// A zero value interval will not be automatically polled,
	// but can still be polled by a [Trigger].
	Interval time.Duration
	// Maximum poll duration.
	// If the duration is 0, the task will not be cancelled by Zenin.
	Timeout time.Duration
}

// NewMonitorService returns a new [MonitorService].
func NewMonitorService(mr MonitorRepository) MonitorService {
	return MonitorService{
		active: map[int]chan<- any{},
		mr:     mr,
	}
}

type MonitorService struct {
	active map[int]chan<- any
	mr     MonitorRepository
}

// Optional contains a value and a flag that indicates if the value is set.
// When valid is true, the value is considered to be populated.
type Optional[T any] struct {
	Valid bool
	Value T
}

// GetMonitorOpts contains optional filters for [MonitorService.Get].
// May be left empty to retrieve all monitors.
type GetMonitorOpts struct {
	// Monitor ID.
	ID []int
	// Active state.
	Active Optional[bool]
	// Include a number of the most recent measurements for each returned monitor.
	RelatedMeasurements int
}

// Get returns monitors matching [GetMonitorOpts].
func (m MonitorService) Get(ctx context.Context, o GetMonitorOpts) ([]Monitor, error) {
	monitors, err := m.mr.Get(ctx, o)
	if err != nil {
		return []Monitor{}, err
	}
	return monitors, nil
}

type GetTagOpts struct {
	// Tag ID.
	ID []int
}

// GetTag returns the tags that match [GetTagOpts],
// or all tags when the options are empty.
func (m MonitorService) GetTag(ctx context.Context, o GetTagOpts) ([]Tag, error) {
	tags, err := m.mr.GetTag(ctx, o)
	if err != nil {
		return []Tag{}, err
	}
	return tags, nil
}

// CreateMonitor describes a new [Monitor].
type CreateMonitor struct {
	Name, Description string
	// When true, the monitor will be active immediately upon creation.
	Active bool
	// Equipped probe.
	// Provide an empty [Equip] if the monitor should be unequipped.
	Equip Optional[Equip]
	// Tag IDs. The monitor will be associated with these tags.
	// Each ID must belong to an existing tag.
	Tags []int
}

// EquipInvalidError describes problems with the fields of an invalid [Equip].
type EquipInvalidError struct {
	Name   string
	Params string
}

// MonitorInvalidError describes problems with the fields of an invalid [Monitor].
type MonitorInvalidError struct {
	Name     string            // Name not empty?
	Equip    EquipInvalidError // Probe exists and params match expected schema?
	Group    string
	Triggers string // All triggers/group/tags exist, etc
	Tags     string
}

func (m MonitorInvalidError) Error() string {
	return "monitor invalid"
}

type MonitorRepository interface {
	Create(ctx context.Context, o CreateMonitor) (Monitor, error)

	// Get returns the monitors that match [GetMonitorOpts],
	// or all monitors when the options are empty.
	Get(ctx context.Context, o GetMonitorOpts) ([]Monitor, error)
	// GetTag returns the tags that match [GetTagOpts],
	// or all tags when the options are empty.
	GetTag(ctx context.Context, o GetTagOpts) ([]Tag, error)
}
