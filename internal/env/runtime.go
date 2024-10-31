package env

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
)

type RuntimeKind string

const (
	Dev  RuntimeKind = "dev"
	Prod RuntimeKind = "prod"
)

var (
	// Version contains the program version. Assigned by linker.
	Version string
	// Commit contains the hash of the current commit. Assigned by linker.
	Commit string
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
	if os.Getenv(rtKindKey) == "dev" {
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

	color := true
	if os.Getenv(rtColorKey) == "false" {
		color = false
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
		Color:      color,
		Redirect:   redirect,
		SignSecret: signSecret,
		BaseDir:    baseDir,
		PluginsDir: pluginsDir,
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
	// May be an empty string if no directory can be resolved.
	BaseDir string
	// PluginsDir is a directory used to store executable plugins.
	// May be an empty string if no directory can be resolved.
	PluginsDir string
	// Version tag. May be `DEV` when running in development.
	Version string
	// Color determines if ANSI color sequences are included in output and logs.
	Color bool
}

// Health uses the provided `Diagnostic` to check for problems with the `RuntimeEnv`.
func (r RuntimeEnv) Health(d *Diagnostic) {
	if r.Kind == Prod && len(r.SignSecret) < 16 {
		d.Warn("sign secret is weak, expected >= 16 bytes")
	}

	if r.BaseDir == "" {
		d.Error("cannot find base directory, provide a path with the `ZENIN_RT_BASE_DIR` environment variable")
	} else {
		base, err := os.Stat(r.BaseDir)
		if err != nil || !base.IsDir() {
			fmt.Println("a")
			if errors.Is(err, fs.ErrNotExist) {
				if err := os.MkdirAll(r.BaseDir, 0755); err != nil {
					d.Error(fmt.Sprintf("make sure base directory exists and is accessible: `%v`", r.BaseDir))
				}
			} else {
				d.Error(fmt.Sprintf("unable to access base directory: `%v`", r.BaseDir))
			}
		}
	}

	if r.PluginsDir == "" {
		d.Error("cannot find plugins directory, provide a path with the `ZENIN_RT_PLUGINS_DIR` environment variable")
	} else {
		plugins, err := os.Stat(r.PluginsDir)
		if err != nil || !plugins.IsDir() {
			if errors.Is(err, fs.ErrNotExist) {
				if err := os.MkdirAll(r.PluginsDir, 0755); err != nil {
					d.Error(fmt.Sprintf("make sure plugins directory exists and is accessible: `%v`", r.PluginsDir))
				}
			} else {
				d.Error(fmt.Sprintf("unable to access plugins directory: `%v`", r.PluginsDir))
			}
		}
	}

	switch runtime.GOOS {
	case "darwin", "linux":
		if _, exists := os.LookupEnv("SHELL"); !exists {
			d.Error("must set `SHELL` environment variable to execute plugins")
		}
		// On Windows, PowerShell is assumed.
	}
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
	rtColorKey      = "ZENIN_RT_COLOR"
	rtRedirectKey   = "ZENIN_RT_REDIRECT"
	rtSignSecretKey = "ZENIN_RT_SIGN_SECRET"
	rtBaseDir       = "ZENIN_RT_BASE_DIR"
	rtPluginsDir    = "ZENIN_RT_PLUGINS_DIR"
)
