package server

import (
	"embed"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/url"
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

	mux := chi.NewRouter()
	if s.config.Env.EnableDebug {
		env.Warn("cors checks are disabled")
		mux.Use(Insecure)
	}
	mux.Use(Log)
	mux.Use(middleware.Timeout(60 * time.Second))

	// UI ->
	var webFS = fs.FS(web)
	sub, err := fs.Sub(webFS, "build")
	if err != nil {
		panic("failed to set web embed sub directory")
	}
	webHandler := http.FileServerFS(sub)
	mux.NotFound(webHandler.ServeHTTP)

	// API ->
	mux.Route("/api/v1", func(v1 chi.Router) {
		v1.Use(Default)
		v1.Use(middleware.AllowContentType("application/json"))
		v1.Mount("/settings", NewSettingsHandler(s.services.Settings))
		v1.Mount("/account", NewAccountHandler(s.services.Account))
		v1.Mount("/feed", NewFeedHandler(s.services.Monitor))

		//// private /////
		v1.Group(func(private chi.Router) {
			private.Use(Authenticate)
			private.Mount("/monitor", NewMonitorHandler(s.services.Monitor))
			private.Mount("/measurement", NewMeasurementHandler(s.services.Measurement))
		})
		//////////////////
	})

	err = http.ListenAndServe(s.config.Address.String(), mux)
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

//go:embed build
var web embed.FS
