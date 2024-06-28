// Package debug contains tools to help debug/test a Zenin server.
package debug

import (
	"github.com/jmkng/zenin/internal/monitor"
)

type Monitor = monitor.Monitor
type Strategy = monitor.Strategy
type ProbeKind = monitor.ProbeKind

const HTTP = monitor.HTTP
const TCP = monitor.TCP
const ICMP = monitor.ICMP
const Ping = monitor.Ping
const Script = monitor.Script

func GetMonitor(kind ProbeKind) Monitor {
	switch kind {
	case monitor.HTTP:
		return getHttpMonitor()
	default:
		panic("todo")
	}
}

func getHttpMonitor() Monitor {
	monitor := Monitor{
		Id: 1,
		Strategy: Strategy{
			Name:               "HTTP Debug Monitor",
			Kind:               HTTP,
			Active:             true,
			Interval:           100,
			Timeout:            5,
			Description:        new(string),
			RemoteAddress:      new(string),
			RemotePort:         new(int16),
			ScriptPath:         new(string),
			HTTPRange:          new(string),
			HTTPMethod:         new(string),
			HTTPHeaders:        new(string),
			HTTPBody:           new(string),
			HTTPExpiredCertMod: new(string),
			ICMPSize:           new(int),
		},
	}
	return monitor
}
