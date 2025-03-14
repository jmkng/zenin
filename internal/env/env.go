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
	"strings"
)

type RepositoryKind int

const (
	Postgres RepositoryKind = iota
	SQLite
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

// Env is an instance of `Environment` initialized at startup.
var Env Environment = NewEnvironment()

func NewEnvironment() Environment {
	var address = "0.0.0.0"
	if x := os.Getenv(addressKey); x != "" {
		address = x
	}
	var port uint16 = 23111
	envPort, err := strconv.ParseUint(os.Getenv(portKey), 10, 16)
	if err == nil {
		port = uint16(envPort)
	}
	var redirect uint16 = 0
	redirectPort, err := strconv.ParseUint(os.Getenv(redirectKey), 10, 16)
	if err == nil {
		redirect = uint16(redirectPort)
	}

	signSecret, err := getSignSecret()
	if err != nil {
		panic(fmt.Errorf("failed to generate sign secret: %w", err))
	}

	stdoutFormat := Flat
	switch key := strings.ToLower(os.Getenv(stdoutFormatKey)); key {
	case "nested":
		stdoutFormat = Nested
	case "json":
		stdoutFormat = JSON
	}
	stdoutTimeFormat := "15:04:05"
	if x := os.Getenv(stdoutTimeFormatKey); x != "" {
		stdoutTimeFormat = x
	}

	baseDir := os.Getenv(baseDirKey)

	if baseDir == "" {
		// Set a default base directory.
		configDir, err := os.UserConfigDir()
		if err == nil {
			baseDir = configDir
			switch runtime.GOOS {
			case "darwin", "windows":
				baseDir = filepath.Join(baseDir, "Zenin")
			case "linux":
				baseDir = filepath.Join(baseDir, "zenin")
			}
		}
	}
	pluginsDir := os.Getenv(pluginsDirKey)
	if pluginsDir == "" && baseDir != "" {
		// If no specific plugins directory was provided, put it in the base directory.
		pluginsDir = filepath.Join(baseDir, "plugins")
	}

	enableColor := true
	if v, err := strconv.ParseBool(os.Getenv(enableColorKey)); err == nil {
		enableColor = v
	}
	enableDebug, err := strconv.ParseBool(os.Getenv(enableDebugKey))
	if err != nil {
		enableDebug = false
	}
	allowInsecure, err := strconv.ParseBool(os.Getenv(allowInsecureKey))
	if err != nil {
		allowInsecure = false
	}

	return Environment{
		Address:          address,
		Port:             port,
		RedirectPort:     redirect,
		SignSecret:       signSecret,
		StdoutFormat:     stdoutFormat,
		StdoutTimeFormat: stdoutTimeFormat,
		BaseDir:          baseDir,
		PluginsDir:       pluginsDir,
		EnableColor:      enableColor,
		EnableDebug:      enableDebug,
		AllowInsecure:    allowInsecure,
		Repository:       NewRepositoryEnvironment(),
	}
}

type LogKind int

const (
	Flat LogKind = iota
	Nested
	JSON
)

type Environment struct {
	// An address for Zenin to bind on.
	Address string
	// A port number for Zenin to use.
	Port uint16
	// A port number used to redirect HTTP requests.
	RedirectPort uint16

	// A sequence used to sign tokens.
	// Autogenerated unless found in the environment.
	SignSecret Secret

	// Controls the format used by the logging mechanism.
	StdoutFormat LogKind
	// Determines the timestamp format in logs sent to standard output.
	StdoutTimeFormat string

	// A base directory used to store files.
	// May be empty if no directory can be resolved.
	BaseDir string
	// A directory used to store executable plugins.
	// May be empty if no directory can be resolved.
	PluginsDir string

	// Determines if ANSI escape codes are used in logging.
	EnableColor bool
	// Allows insecure behavior and enables debug logging.
	EnableDebug bool

	AllowInsecure bool

	Repository RepositoryEnv
}

// GetLocalRepositoryPath returns the expected path of a local database file.
func (e Environment) GetLocalRepositoryPath() string {
	return filepath.Join(e.BaseDir, e.Repository.Name)
}

func (e Environment) Diagnose(dx *Diagnostic) {
	if !e.AllowInsecure && len(e.SignSecret) < 16 {
		dx.Error("sign secret is weak, expected >= 16 bytes")
	}

	if e.BaseDir == "" {
		dx.Error("cannot find base directory, provide a path with the `ZENIN_BASE_DIR` environment variable")
	} else {
		if !filepath.IsAbs(e.BaseDir) {
			dx.Error("base directory should be an absolute path")
		}

		base, err := os.Stat(e.BaseDir)
		if err != nil || !base.IsDir() {
			if errors.Is(err, fs.ErrNotExist) {
				if err := os.MkdirAll(e.BaseDir, 0755); err != nil {
					dx.Error(fmt.Sprintf("make sure base directory exists and is accessible: `%v`", e.BaseDir))
				}
			} else {
				dx.Error(fmt.Sprintf("unable to access base directory: `%v`", e.BaseDir))
			}
		}
	}

	if e.PluginsDir == "" {
		dx.Error("cannot find plugins directory, provide a path with the `ZENIN_PLUGINS_DIR` environment variable")
	} else {
		if !filepath.IsAbs(e.PluginsDir) {
			dx.Error("plugins directory should be an absolute path")
		}

		plugins, err := os.Stat(e.PluginsDir)
		if err != nil || !plugins.IsDir() {
			if errors.Is(err, fs.ErrNotExist) {
				if err := os.MkdirAll(e.PluginsDir, 0755); err != nil {
					dx.Error(fmt.Sprintf("make sure plugins directory exists and is accessible: `%v`", e.PluginsDir))
				}
			} else {
				dx.Error(fmt.Sprintf("unable to access plugins directory: `%v`", e.PluginsDir))
			}
		}
	}

	switch runtime.GOOS {
	case "darwin", "linux":
		if _, exists := os.LookupEnv("SHELL"); !exists {
			dx.Error("must set `SHELL` environment variable to execute plugins")
		}
		// On Windows, PowerShell is assumed.
	}
}

func NewRepositoryEnvironment() RepositoryEnv {
	var kind RepositoryKind
	switch key := strings.ToLower(os.Getenv(repoKindKey)); key {
	case "postgres":
		kind = Postgres
	case "sqlite":
		kind = SQLite
	}

	username := os.Getenv(repoUsernameKey)
	password := os.Getenv(repoPasswordKey)
	host := os.Getenv(repoAddressKey)
	port := os.Getenv(repoPortKey)
	name := os.Getenv(repoNameKey)

	var maxConn uint16
	envMaxConn, err := strconv.ParseUint(os.Getenv(repoMaxConnKey), 10, 16)
	if err == nil {
		maxConn = uint16(envMaxConn)
	}

	return RepositoryEnv{
		Kind:     kind,
		Username: username,
		Password: password,
		Host:     host,
		Port:     port,
		Name:     name,
		MaxConn:  maxConn,
	}
}

type RepositoryEnv struct {
	// Repository kind hint.
	// Influences initial connection attempt.
	Kind RepositoryKind
	// Username for remote repository authentication.
	//
	//  - SQLite: Ignored
	Username string
	// Password for remote repository authentication.
	//
	//  - SQLite: Ignored
	Password string
	// Remote repository address.
	//
	//  - SQLite: Ignored
	Host string
	// Remote repository port.
	//
	//  - SQLite: Ignored
	Port string
	// Name of the database to use.
	//
	//  - SQLite: Indicates the name of the SQLite database file within the base directory.
	Name string
	// Maximum number of open connections to the database.
	//
	// See documentation of package [database/sql] for details.
	//
	// https://pkg.go.dev/database/sql#DB.SetMaxOpenConns
	MaxConn uint16
}

func GetRandomBytes(length int) ([]byte, error) {
	salt := make([]byte, length)
	_, err := rand.Read(salt)
	if err != nil {
		return salt, fmt.Errorf("failed to generate byte array: %w", err)
	}
	return salt, nil
}

func getSignSecret() (Secret, error) {
	signSecretEnv := os.Getenv(signSecretKey)
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
	addressKey          = "ZENIN_ADDRESS"
	portKey             = "ZENIN_PORT"
	redirectKey         = "ZENIN_REDIRECT_PORT"
	signSecretKey       = "ZENIN_SIGN_SECRET"
	stdoutFormatKey     = "ZENIN_STDOUT_FORMAT"
	stdoutTimeFormatKey = "ZENIN_STDOUT_TIME_FORMAT"
	baseDirKey          = "ZENIN_BASE_DIR"
	pluginsDirKey       = "ZENIN_PLUGINS_DIR"
	enableColorKey      = "ZENIN_ENABLE_COLOR"
	enableDebugKey      = "ZENIN_ENABLE_DEBUG"
	allowInsecureKey    = "ZENIN_ALLOW_INSECURE"
	repoKindKey         = "ZENIN_REPO_KIND"
	repoUsernameKey     = "ZENIN_REPO_USERNAME"
	repoPasswordKey     = "ZENIN_REPO_PASSWORD"
	repoAddressKey      = "ZENIN_REPO_ADDRESS"
	repoPortKey         = "ZENIN_REPO_PORT"
	repoNameKey         = "ZENIN_REPO_NAME"
	repoMaxConnKey      = "ZENIN_REPO_MAX_CONN"
)
