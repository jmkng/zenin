package account

import (
	"testing"
)

func TestIsValidAccountPassword(t *testing.T) {
	tests := []struct {
		password string
		expected bool
		name     string
	}{
		{
			password: "Password123",
			expected: true,
			name:     "TestValidPassword",
		},
		{
			password: "P@ssw0rd!",
			expected: true,
			name:     "TestValidWithSpecial",
		},
		{
			password: "Valid1CaseUpper",
			expected: true,
			name:     "TestValidMixed",
		},
		{
			password: "Short1!",
			expected: false,
			name:     "TestInvalidTooShort",
		},
		{
			password: "aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!aA123!",
			expected: false,
			name:     "TestInvalidTooLong",
		},
		{
			password: "12345678",
			expected: false,
			name:     "TestInvalidNoAlpha",
		},
		{
			password: "password123",
			expected: false,
			name:     "TestInvalidNoUppercase",
		},
		{
			password: "PASSWORD123",
			expected: false,
			name:     "TestInvalidNoLowercase",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result := isValidAccountPassword(test.password)
			if result != test.expected {
				t.Errorf("for password '%s', expected %v but got %v", test.password, test.expected, result)
			}
		})
	}
}
