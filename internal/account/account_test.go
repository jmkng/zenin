package account

import (
	"testing"
)

func TestAccountValidate(t *testing.T) {
	application := Application{
		Username:          "helloworld",
		PasswordPlainText: "password1",
	}
	if application.Validate() == nil {
		t.Errorf("password must not pass validation: %v", application.PasswordPlainText)
	}
	application.PasswordPlainText = "Passw0rd1"
	if application.Validate() != nil {
		t.Errorf("password must pass validation: %v", application.PasswordPlainText)
	}
}
