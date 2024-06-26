package server

import (
	"net"

	"github.com/jmkng/zenin/internal/bundle"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/log"
)

// New returns a new Server.
func New(config Configuration, bundle bundle.Bundle) *Server {
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

// Listen will block and start listening.
func (s *Server) Serve() error {
	log.Warn("serve is a no-op") // TODO
	//log.Info("server starting", "ip", s.config.Address.IP, "port", s.config.Address.Port)
	//log.Debug("server stopping")
	return nil
}

func NewConfiguration(runtime *env.RuntimeEnv) Configuration {
	address := net.TCPAddr{
		IP:   net.IPv4(127, 0, 0, 1),
		Port: int(runtime.Port),
	}
	return Configuration{Address: address, Tls: nil} // TODO: TLS setup will happen here.
}

// Configuration controls the behavior of a Zenin Server.
type Configuration struct {
	Address net.TCPAddr
	Tls     *TLSConfiguration
}

// TLSConfiguration contains TLS configuration options for the Zenin Server.
type TLSConfiguration struct {
	Cert []byte
	Key  []byte
}
