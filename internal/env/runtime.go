package env

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/jmkng/zenin/internal"
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
	var pluginsDir string

	configDir, err := os.UserConfigDir()
	if err == nil {
		baseDir = configDir
		switch runtime.GOOS {
		case "darwin", "windows":
			baseDir = filepath.Join(baseDir, "Zenin")
		case "linux":
			baseDir = filepath.Join(baseDir, "zenin")
		}
		pluginsDir = filepath.Join(baseDir, "plugins")
	}

	// Directories provided by the user take precedence.
	if base := os.Getenv(rtBaseDir); base != "" {
		baseDir = base
	}
	if plugins := os.Getenv(rtPluginsDir); plugins != "" {
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

// Validate will return an error of type `Validation` describing problems with the runtime environment.
func (r RuntimeEnv) Validate() internal.Validation {
	validation := internal.NewValidation()

	if r.Kind == Prod && len(r.SignSecret) < 16 {
		validation.Push("sign secret must be >= 16 bytes\nprovide a longer secret or unset `ZENIN_RT_SIGN_SECRET` to have one generated")
	}

	base, err := os.Stat(r.BaseDir)
	if err != nil || r.BaseDir == "" {
		validation.Push("base directory path is not set\nprovide an absolute path by setting `ZENIN_RT_BASE_DIR`")
	} else if !base.IsDir() {
		validation.Push("base directory path points to a file\nmake sure `ZENIN_RT_BASE_DIR` points to a directory")
	}
	plugins, err := os.Stat(r.PluginDir)
	if err != nil || r.PluginDir == "" {
		validation.Push("plugins directory path is not set\nprovide an absolute path by setting `ZENIN_RT_PLUGINS_DIR`")
	} else if !plugins.IsDir() {
		validation.Push("plugins directory path points to a file\nmake sure `ZENIN_RT_PLUGINS_DIR` points to a directory")
	}

	switch runtime.GOOS {
	case "darwin", "linux":
		if _, exists := os.LookupEnv("SHELL"); !exists {
			validation.Push("must set `SHELL` to execute plugins")
		}
	}

	return validation
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
	rtPluginsDir    = "ZENIN_RT_PLUGINS_DIR"
)
