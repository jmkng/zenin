package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jmkng/zenin/internal/bundle"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
)

// NewServer returns a new Server.
func NewServer(config Configuration, bundle bundle.Bundle) *Server {
	return &Server{
		config: config,
		bundle: bundle,
	}
}

// Server is the Zenin server.
type Server struct {
	config Configuration
	bundle bundle.Bundle
}

func HandleIndex(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "index")
}

// Listen will block and start listening.
func (s *Server) Serve() error {
	log.Info("server starting", "ip", s.config.Address.IP, "port", s.config.Address.Port)

	mux := chi.NewRouter()
	if env.Runtime.Kind == env.Dev {
		log.Warn("cors checks are disabled")
		mux.Use(Insecure)
	}
	mux.Use(middleware.AllowContentType("application/json"))
	mux.Use(Logger)
	mux.Use(Defaults)
	//mux.Use(middleware.Timeout(60 * time.Second))

	//	mux.Get("/", func(w http.ResponseWriter, r *http.Request) {
	//		panic("todo mount ui")
	//	})

	mux.Route("/api/v1", func(v1 chi.Router) {
		v1.Mount("/meta", NewMetaHandler(s.bundle.Meta))
		v1.Mount("/account", NewAccountHandler(s.bundle.Account))
		v1.Group(func(private chi.Router) {
			private.Use(Authenticator)
			private.Mount("/monitor", NewMonitorHandler(s.bundle.Monitor))
		})
	})

	err := http.ListenAndServe(s.config.Address.String(), mux)
	if err != nil {
		return err
	}

	log.Debug("server stopping")
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

func StrictDecoder(r io.Reader) *json.Decoder {
	d := json.NewDecoder(r)
	d.DisallowUnknownFields()
	return d
}
