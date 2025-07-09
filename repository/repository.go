package repository

import (
	"iter"
	"maps"
	"math/rand"
	"reflect"
	"slices"
	"testing"
	"time"

	"github.com/jmkng/zenin"
	"github.com/jmkng/zenin/internal/validate"
	"github.com/jmkng/zenin/probe"
)

type TestOpts struct {
	// Disables parallelized testing.
	DisableParallel bool
	// Tests use pseudorandom number generation for test data.
	// Set a custom seed here.
	Seed int64
}

type InitFunc = func() (zenin.Repository, func())

// Test will exercise a [zenin.Repository] implementation.
// Call this function from your own test.
func Test(t *testing.T, init InitFunc, o TestOpts) {
	seed := int64(2)
	if o.Seed != 0 {
		seed = o.Seed
	}
	rng := func() *rand.Rand {
		return rand.New(rand.NewSource(seed))
	}

	// Test monitor creation.
	// Generated monitors obey validation rules. The repository should be able to store these.
	t.Run("MonitorCreateRandomized", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		zeroTime := false
		zeroID := false

		generated := 100
		for v := range yieldCreateMonitor(rng(), generated) {
			id, created, err := repo.Monitor().Create(t.Context(), v)
			if err != nil {
				t.Errorf("creating monitor: %v\nseed: %#v", err, v)
				continue
			}
			if created.IsZero() {
				zeroTime = true
			}
			if id <= 0 {
				zeroID = true
			}
		}

		// Don't enforce any particular time precision for created/update times,
		// but expect something back.
		// Same for ID.
		if zeroTime {
			t.Error("returned time must not be zero value")
		}
		if zeroID {
			t.Error("returned id must be positive non-zero integer")
		}
	})

	t.Run("MonitorGetIntegrityCheck", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		// Create a single monitor, roundtrip it,
		// make sure the same data comes back.

		var monitor zenin.CreateMonitor
		for v := range yieldCreateMonitor(rng(), 1) {
			monitor = v
		}
		_, _, err := repo.Monitor().Create(t.Context(), monitor)
		if err != nil {
			t.Fatalf("creating monitor: %v\nseed=%#v", err, monitor)
		}

		result, err := repo.Monitor().Get(t.Context(), zenin.GetMonitorOpts{})
		if err != nil {
			t.Fatalf("getting monitors: %v", err)
		}
		if !compareMonitor(monitor, result[0]) {
			t.Fatalf("monitor integrity check failed\nseed: %#v\nmonitor: %#v", monitor, result[0])
		}
	})

	t.Run("MonitorGetZeroOptsReturnsAll", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		generated := 5
		monitors := make([]zenin.CreateMonitor, 0, generated)
		for v := range yieldCreateMonitor(rng(), generated) {
			monitors = append(monitors, v)
		}
		for _, v := range monitors {
			_, _, err := repo.Monitor().Create(t.Context(), v)
			if err != nil {
				t.Fatalf("creating monitor: %v\nseed=%#v", err, v)
			}
		}

		// Inserted {generated}. Expect that many back.
		result, err := repo.Monitor().Get(t.Context(), zenin.GetMonitorOpts{})
		if err != nil {
			t.Fatalf("getting monitors: %v", err)
		}

		if len(result) != generated {
			t.Fatalf("seeded %d monitors: expected %d back: got %d", generated, generated, len(result))
		}
	})

	t.Run("MonitorGetByID", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		// This should always be >1.
		generated := 5

		monitors := make([]zenin.CreateMonitor, 0, generated)
		for v := range yieldCreateMonitor(rng(), generated) {
			monitors = append(monitors, v)
		}
		requestIDs := make([]int64, 0, generated)
		for i, v := range monitors {
			id, _, err := repo.Monitor().Create(t.Context(), v)
			if err != nil {
				t.Fatalf("creating monitor: %v\nseed=%#v", err, v)
			}

			// Ask for a subset back.
			// Every other monitor.
			if i%2 == 1 {
				requestIDs = append(requestIDs, id)
			}
		}

		result, err := repo.Monitor().Get(t.Context(), zenin.GetMonitorOpts{ID: requestIDs})
		if err != nil {
			t.Fatalf("getting monitors: %v", err)
		}
		resultMap := make(map[int64]struct{})
		for _, v := range result {
			resultMap[v.ID] = struct{}{}
		}

		// Make sure each requested monitor is in the result.
		for _, v := range requestIDs {
			if _, ok := resultMap[v]; !ok {
				slices.Sort(requestIDs)
				resultIDs := slices.Sorted(maps.Keys(resultMap))
				t.Fatalf("seeded %d monitors: requested ids %v: got ids %v", generated, requestIDs, resultIDs)
			}
		}
	})

	t.Run("MonitorGetByActiveState", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		const generated = 5
		const activeCount = 2

		monitors := make([]zenin.CreateMonitor, 0, generated)
		for v := range yieldCreateMonitor(rng(), generated) {
			monitors = append(monitors, v)
		}
		for i, v := range monitors {
			var active bool
			active = i < activeCount
			v.Active = active
			if _, _, err := repo.Monitor().Create(t.Context(), v); err != nil {
				t.Fatalf("creating monitor %d: %v\nseed=%#v", i, err, v)
			}
		}

		checkByActive := func(want bool) {
			result, err := repo.Monitor().Get(t.Context(), zenin.GetMonitorOpts{
				Active: zenin.Optional[bool]{Valid: true, Value: want},
			})
			if err != nil {
				t.Fatalf("getting monitors: %v", err)
			}
			for _, m := range result {
				if m.Active != want {
					t.Fatalf("requested active=%v: result has active=%v", want, m.Active)
				}
			}
		}

		checkByActive(true)
		checkByActive(false)
	})

	t.Run("MonitorGetCombinationOpts", func(t *testing.T) {
		if !o.DisableParallel {
			t.Parallel()
		}
		repo, clean := init()
		defer clean()

		// When multiple fields in an *Opts type struct are set,
		// they should be combined with "AND" logic for consistency.
		// This test makes sure the repository does that.
		//
		// This behavior is useful for certain queries, but impractical for others.
		// The alternative is defaulting to OR, which has its own problems, or allowing the caller to pick an operator,
		// which is a complication.

		const generated = 2
		monitors := make([]zenin.CreateMonitor, 0, generated)

		// Make two monitors, one active and one inactive.
		i := 0
		for v := range yieldCreateMonitor(rng(), generated) {
			var active bool
			if i == 0 {
				active = true
			}
			v.Active = active
			monitors = append(monitors, v)
			i++
		}

		// Seed the monitors.
		ai := make(map[bool]int64, 2)
		for _, v := range monitors {
			id, _, err := repo.Monitor().Create(t.Context(), v)
			if err != nil {
				t.Errorf("creating monitor: %v\nseed: %#v", err, v)
				continue
			}
			ai[v.Active] = id
		}

		// Ask for the active and inactive monitors by ID,
		// but also specify active only. This should return one monitor, not two.
		opts := zenin.GetMonitorOpts{
			ID:     []int64{ai[true], ai[false]},
			Active: zenin.Optional[bool]{Valid: true, Value: true},
		}

		result, err := repo.Monitor().Get(t.Context(), opts)
		if err != nil {
			t.Fatalf("getting monitors: %v\noptions: %#v", err, opts)
		}
		if len(result) != 1 {
			t.Fatalf("options should be combined with \"AND\" logic: expected 1 result: got %d", len(result))
		}
	})
} // Test

// yieldCreateMonitor returns an iterator of [zenin.CreateMonitor].
// Values are generated using rng.
func yieldCreateMonitor(rng *rand.Rand, n int) iter.Seq[zenin.CreateMonitor] {
	return func(yield func(zenin.CreateMonitor) bool) {
		for range n {
			equipped := rng.Intn(2) == 0
			cm := zenin.CreateMonitor{
				Name:        randomName(rng),
				Description: randomDesc(rng),
				Active:      rng.Intn(2) == 0,
			}
			if equipped {
				interval := rng.Int63n(int64(30 * 24 * time.Hour))
				timeout := rng.Int63n(int64(5 * time.Minute))
				probeID := probe.IDPlugin
				var params probe.Poller
				switch probeID {
				case probe.IDPlugin:
					params = probe.Plugin{Path: randomString(rng, 10+rng.Intn(200))}
				}
				cm.Equip = zenin.Optional[zenin.Equip]{
					Valid: true,
					Value: zenin.Equip{
						ProbeID:    probe.IDPlugin,
						Interval:   time.Duration(interval),
						Timeout:    time.Duration(timeout),
						Parameters: params,
					},
				}
			}
			if !yield(cm) {
				return
			}
		}
	}
}

// randomName returns a random string within allowed monitor name bounds.
func randomName(rng *rand.Rand) string {
	length := validate.MinNameLen + rng.Intn(validate.MaxNameLen-validate.MinNameLen+1)
	return randomString(rng, length)
}

// randomDesc returns a random string within allowed monitor description bounds.
func randomDesc(rng *rand.Rand) string {
	var desc string
	if rng.Float64() < 0.1 {
		desc = ""
	} else {
		desc = randomString(rng, 200+rng.Intn(301))
	}
	return desc
}

// randomString returns a string of length l.
func randomString(rng *rand.Rand, l int) string {
	const g = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const spaceChance = 0.05

	b := make([]byte, l)
	for i := range b {
		if rng.Float64() < spaceChance && i != 0 && i != l-1 { // No spaces at beginning or end.
			b[i] = ' '
		} else {
			b[i] = g[rng.Intn(len(g))]
		}
	}
	return string(b)
}

// compareMonitor returns true if the [zenin.CreateMonitor] matches the [zenin.Monitor]
func compareMonitor(c zenin.CreateMonitor, m zenin.Monitor) bool {
	if c.Name != m.Name ||
		c.Description != m.Description ||
		c.Active != m.Active ||
		c.Equip.Valid != m.Equip.Valid {
		return false
	}
	if c.Equip.Valid {
		e1 := c.Equip.Value
		e2 := m.Equip.Value
		if e1.ProbeID != e2.ProbeID ||
			e1.Interval != e2.Interval ||
			e1.Timeout != e2.Timeout {
			return false
		}
		if !reflect.DeepEqual(e1.Parameters, e2.Parameters) {
			return false
		}
	}
	return true
}
