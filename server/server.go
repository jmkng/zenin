package server

import (
	"embed"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	"github.com/jmkng/zenin/internal/settings"
)

func NewConfig(e env.Environment) (Config, error) {
	ip := net.ParseIP(e.Address)
	if ip == nil {
		return Config{}, errors.New("server ip address is invalid")
	}

	address := net.TCPAddr{
		IP:   ip,
		Port: int(e.Port),
	}

	return Config{Env: e, Address: address, Tls: nil}, nil // TODO: TLS setup will happen here.
}

// Config controls the behavior of a Zenin Server.
type Config struct {
	Env     env.Environment
	Address net.TCPAddr
	Tls     *TlsConfig
}

// TlsConfig contains TLS configuration options for the Zenin Server.
type TlsConfig struct {
	Cert []byte
	Key  []byte
}

// StrictDecoder returns a `*json.Decoder` with `DisallowUnknownFields` set.
func StrictDecoder(r io.Reader) *json.Decoder {
	d := json.NewDecoder(r)
	d.DisallowUnknownFields()
	return d
}

type Services struct {
	Settings    settings.SettingsService
	Measurement measurement.MeasurementService
	Monitor     monitor.MonitorService
	Account     account.AccountService
}

// NewServer returns a new `Server`.
func NewServer(c Config, s Services) *Server {
	return &Server{config: c, services: s}
}

// Server is the Zenin server.
type Server struct {
	config   Config
	services Services
}

// Listen will block and listen for incoming requests.
func (s *Server) Serve() error {
	env.Info("server starting", "address", s.config.Address.IP.String(), "port", s.config.Address.Port)

	settings := s.services.Settings
	account := s.services.Account
	monitor := s.services.Monitor
	measurement := s.services.Measurement

	mux := chi.NewRouter()
	if s.config.Env.AllowInsecure {
		env.Warn("cors checks are disabled")
		mux.Use(Insecure)
	}
	mux.Use(Log)
	mux.Use(middleware.Timeout(60 * time.Second))

	v1 := chi.NewRouter()
	v1.Mount("/settings", NewSettingsHandler(settings))
	v1.Mount("/account", NewAccountHandler(account))
	v1.Mount("/feed", NewFeedHandler(monitor))
	v1.Group(func(private chi.Router) {
		private.Use(Authenticate)
		private.Mount("/monitor", NewMonitorHandler(monitor))
		private.Mount("/measurement", NewMeasurementHandler(measurement))
	})

	api := chi.NewRouter()
	api.Mount("/v1", v1)
	api.NotFound(notFoundHandler)

	mux.Mount("/api", api)
	mux.Mount("/", NewEmbed(settings))

	err := http.ListenAndServe(s.config.Address.String(), mux)
	if err != nil {
		return err
	}

	env.Debug("server stopping")
	return nil
}

// scanQueryParameterIds will return all comma separated ids in the value map.
func scanQueryParameterIds(values url.Values) []int {
	id := []int{}

	if vid := values.Get("id"); vid != "" {
		split := strings.Split(vid, ",")
		for _, v := range split {
			if num, err := strconv.Atoi(v); err == nil {
				id = append(id, num)
			}
		}
	}

	return id
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	responder.Status(http.StatusNotFound)
}

func NewEmbed(service settings.SettingsService) Embed {
	sub, err := fs.Sub(build, "build")
	if err != nil {
		panic("failed to set embed sub directory")
	}
	return Embed{fs: sub, service: service}
}

// Embed contains the embedded user interface.
type Embed struct {
	fs      fs.FS
	service settings.SettingsService
}

func (e Embed) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	responder := NewResponder(w)
	if r.Method != "GET" {
		responder.Status(http.StatusMethodNotAllowed)
		return
	}
	if strings.HasSuffix(r.URL.Path, "/index.html") {
		localRedirect(w, r, "./")
		return
	}

	// "Paths must not start or end with a slash: “/x” and “x/” are invalid.""
	// https://pkg.go.dev/io/fs#ValidPath
	name := path.Clean(r.URL.Path)
	contentType := ""
	ext := path.Ext(name)

	// Requests for .html (or no extension) receive index.html, routing handled by client.
	if name == "/" || ext == "" || ext == ".html" {
		name = "index.html"
		contentType = ContentTypeTextHtmlUTF8
	}
	name = strings.TrimPrefix(name, "/")

	env.Debug("embed file access", "name", name)
	f, err := e.fs.Open(name)
	if err != nil {
		responder.Error(err, toCode(err))
		return
	}
	defer f.Close()
	d, err := f.Stat()
	if err != nil {
		responder.Error(err, toCode(err))
		return
	}

	if contentType == "" {
		// Don't use ext for extension here, name may have changed.
		contentType = mime.TypeByExtension(path.Ext(name))
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(d.Size(), 10))
	w.WriteHeader(http.StatusOK)
	if _, err = io.Copy(w, f); err != nil {
		responder.Status(http.StatusInternalServerError)
	}
}

func localRedirect(w http.ResponseWriter, r *http.Request, location string) {
	responder := NewResponder(w)
	if q := r.URL.RawQuery; q != "" {
		location += "?" + q
	}
	env.Debug("embed local redirect", "location", location)
	responder.Redirect(location, http.StatusMovedPermanently)
}

func toCode(err error) int {
	if errors.Is(err, fs.ErrNotExist) {
		return http.StatusNotFound
	}
	if errors.Is(err, fs.ErrPermission) {
		return http.StatusForbidden
	}

	return http.StatusInternalServerError
}

//go:embed build
var build embed.FS
