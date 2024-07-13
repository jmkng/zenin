package server

import (
	"fmt"
	"testing"

	"github.com/jmkng/zenin/internal/debug"
)

func TestExtractBearerToken(t *testing.T) {
	expect := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	token := fmt.Sprintf("Bearer %v", expect)
	debug.AssertEqual(t, extractBearerToken(token), expect)
}
