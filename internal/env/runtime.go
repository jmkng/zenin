package env

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type RuntimeKind string

const (
	Dev  RuntimeKind = "dev"
	Prod RuntimeKind = "prod"
)

type Secret []byte

func (s Secret) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (s Secret) String() string {
	return "***"
}

// Runtime is an instance of `RuntimeEnv` initialized at startup.
var Runtime *RuntimeEnv = NewRuntimeEnv()

// getRandomBytes will generate a cryptographically random byte array with the provided length.
func GetRandomBytes(length int) ([]byte, error) {
	salt := make([]byte, length)
	_, err := rand.Read(salt)
	if err != nil {
		return salt, fmt.Errorf("failed to generate byte array: %w", err)
	}
	return salt, nil
}

func NewRuntimeEnv() *RuntimeEnv {
	kind := Prod
	if strings.ToLower(os.Getenv(rtKindKey)) == "dev" {
		kind = Dev
	}

	var port uint16 = 50010
	envPort, err := strconv.ParseUint(os.Getenv(rtPortKey), 10, 16)
	if err == nil {
		port = uint16(envPort)
	}

	var redirect uint16 = 0
	redirectPort, err := strconv.ParseUint(os.Getenv(rtRedirectKey), 10, 16)
	if err == nil {
		redirect = uint16(redirectPort)
	}

	signSecret, err := getSignSecret()
	if err != nil {
		panic(err)
	}

	return &RuntimeEnv{Kind: kind, Port: port, Redirect: redirect, SignSecret: signSecret}
}

type RuntimeEnv struct {
	// Kind is the runtime environment, either "dev" or "prod".
	Kind RuntimeKind
	// Port is the port number that Zenin runs the primary server on.
	Port uint16
	// Redirect is the port that Zenin should run the unsecure (HTTP) server on,
	// in order to redirect traffic to the secure (HTTPS) server running on Port.
	Redirect uint16
	// SignSecret is a secret key used to sign tokens. If not found in the environment,
	// a key will be generated at runtime.
	SignSecret Secret
}

func getSignSecret() (Secret, error) {
	signSecretEnv := os.Getenv(rtSignSecretKey)
	if signSecretEnv != "" {
		return []byte(signSecretEnv), nil
	}
	secret, err := GetRandomBytes(32)
	if err != nil {
		return []byte{}, err
	}
	return secret, nil
}

const (
	rtKindKey       = "ZENIN_RT_LEVEL"
	rtPortKey       = "ZENIN_RT_PORT"
	rtRedirectKey   = "ZENIN_RT_REDIRECT"
	rtSignSecretKey = "ZENIN_RT_SIGN_SECRET"
)
