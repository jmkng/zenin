package server

import (
	"testing"

	"github.com/jmkng/zenin/internal/debug"
	"github.com/jmkng/zenin/internal/measurement"
)

func TestSelectParamsFromQuery(t *testing.T) {
	values := map[string][]string{}
	values["id"] = []string{"1,2,3", "6,7,5"}
	values["kind"] = []string{"http"}
	values["active"] = []string{"true"}
	id := []int{1, 2, 3}
	params := SelectParamsFromQuery(values)
	debug.AssertEqual(t, len(*params.Id), len(id))
	for i, v := range *params.Id {
		debug.AssertEqual(t, v, id[i])
	}
	http := measurement.HTTP
	debug.AssertEqual(t, *params.Kind, http)
	active := true
	debug.AssertEqual(t, *params.Active, active)
}
