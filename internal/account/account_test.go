package account

import (
	"testing"

	"github.com/jmkng/zenin/internal/debug"
)

func TestAccountValidate(t *testing.T) {
	debug.Assert(t, Application{
		Username:          "helloworld",
		PasswordPlainText: "password1",
	}.Validate() != nil, "password should be rejected")
	debug.Assert(t, Application{
		Username:          "helloworld",
		PasswordPlainText: "Passw0rd1",
	}.Validate() == nil, "password should be accepted")
}
