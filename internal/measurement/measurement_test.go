package measurement

import (
	"testing"

	"github.com/jmkng/zenin/internal/debug"
)

func TestSpanDowngrade(t *testing.T) {
	span := NewSpan(Ok)
	debug.Assert(t, span.State == Ok)
	span.Downgrade(Warn)
	debug.Assert(t, span.State == Warn)
	span.Downgrade(Ok)
	debug.Assert(t, span.State == Warn)
	span.Downgrade(Dead)
	debug.Assert(t, span.State == Dead)
	span.Downgrade(Warn)
	debug.Assert(t, span.State == Dead)
}
