package server

import (
	"embed"
	"encoding/json"
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
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/service"
)

// NewServer returns a new Server.
func NewServer(config Configuration, bundle service.Bundle) *Server {
	return &Server{
		config: config,
		bundle: bundle,
	}
}

// Server is the Zenin server.
type Server struct {
	config Configuration
	bundle service.Bundle
}

// Listen will block and start listening.
func (s *Server) Serve() error {
	env.Info("server starting", "ip", s.config.Address.IP, "port", s.config.Address.Port)

	mux := chi.NewRouter()
	if env.Runtime.Kind == env.Dev {
		env.Warn("cors checks are disabled")
		mux.Use(Insecure)
	}
	mux.Use(Logger)
	mux.Use(middleware.Timeout(60 * time.Second))

	// UI ->
	var webFS = fs.FS(web)
	sub, err := fs.Sub(webFS, "build")
	if err != nil {
		panic("failed to set web embed sub directory to `build`")
	}
	webHandler := http.FileServerFS(sub)
	mux.NotFound(webHandler.ServeHTTP)

	// API ->
	mux.Route("/api/v1", func(v1 chi.Router) {
		v1.Use(Defaults)
		v1.Use(middleware.AllowContentType("application/json"))
		v1.Mount("/meta", NewMetaHandler(s.bundle.Meta))
		v1.Mount("/account", NewAccountHandler(s.bundle.Account))
		v1.Mount("/feed", NewFeedHandler(s.bundle.Monitor))

		//// private /////
		v1.Group(func(private chi.Router) {
			private.Use(Authenticator)
			private.Mount("/monitor", NewMonitorHandler(s.bundle.Monitor))
			private.Mount("/measurement", NewMeasurementHandler(s.bundle.Measurement))
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

func NewConfiguration(runtime *env.RuntimeEnv) Configuration {
	address := net.TCPAddr{
		IP:   net.IPv4(127, 0, 0, 1),
		Port: int(runtime.Port),
	}
	return Configuration{Address: address, Tls: nil} // todo TLS setup will happen here.
}

// Configuration controls the behavior of a Zenin Server.
type Configuration struct {
	Address net.TCPAddr
	Tls     *TlsConfiguration
}

// TlsConfiguration contains TLS configuration options for the Zenin Server.
type TlsConfiguration struct {
	Cert []byte
	Key  []byte
}

// StrictDecoder returns a `*json.Decoder` with `DisallowUnknownFields` set.
func StrictDecoder(r io.Reader) *json.Decoder {
	d := json.NewDecoder(r)
	d.DisallowUnknownFields()
	return d
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
