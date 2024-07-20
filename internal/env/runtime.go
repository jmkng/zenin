package env

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"

	"github.com/jmkng/zenin/internal/log"
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

	var baseDir string
	switch runtime.GOOS {
	case "windows":
		baseDir = "C\\ProgramData\\zenin"
	case "darwin", "linux":
		baseDir = "/usr/local/zenin"
	}

	if base := os.Getenv(rtBaseDir); base != "" {
		baseDir = base
	}
	var pluginsDir string
	switch runtime.GOOS {
	case "windows":
		pluginsDir = "C\\ProgramData\\zenin\\plugins"
	case "darwin", "linux":
		pluginsDir = "/usr/local/zenin/plugins"
	}
	if plugins := os.Getenv(rtPluginDir); plugins != "" {
		pluginsDir = plugins
	}

	return &RuntimeEnv{
		Kind:       kind,
		Port:       port,
		Redirect:   redirect,
		SignSecret: signSecret,
		BaseDir:    baseDir,
		PluginDir:  pluginsDir,
	}
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
	// BaseDir is a directory used to store files accessible to Zenin.
	BaseDir string
	// PluginDir is a directory used to store executable plugins.
	PluginDir string
}

var EnvironmentError = errors.New("the environment is invalid")

func (r RuntimeEnv) Validate() error {
	var err error
	if r.Kind == Prod && len(r.SignSecret) < 16 {
		log.Error("sign secret must be >=16 bytes, provide a longer secret or unset `ZENIN_RT_SIGN_SECRET` to generate one",
			"length", len(r.SignSecret))
		err = EnvironmentError
	}

	// Not returning as error right now, because these may not even be required.
	// Right now you only need them to set up plugin (script) monitors.
	baseInfo, err := os.Stat(r.BaseDir)
	if err != nil {
		log.Warn("base directory not found", "path", r.BaseDir)
	} else {
		if _, err := os.Open(r.BaseDir); err != nil || !baseInfo.IsDir() {
			log.Warn("base directory is inaccessible", "path", r.BaseDir)
		}
	}
	pluginsDir, err := os.Stat(r.PluginDir)
	if err != nil {
		log.Warn("plugins directory not found", "path", r.PluginDir)
	} else {
		if _, err := os.Open(r.PluginDir); err != nil || !pluginsDir.IsDir() {
			log.Warn("plugin directory is inaccessible", "path", r.PluginDir)
		}
	}

	return nil
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
	rtBaseDir       = "ZENIN_RT_BASE_DIR"
	rtPluginDir     = "ZENIN_RT_PLUGIN_DIR"
)
