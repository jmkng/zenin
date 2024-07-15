// Package debug contains tools to help debug/test a Zenin server.
package debug

import (
	"github.com/jmkng/zenin/internal/monitor"
)

func GetHttpMonitor() monitor.Monitor {
	id := 1
	httpRange := monitor.Successful
	_ = monitor.Get
	monitor := monitor.Monitor{
		Id:                 &id,
		Name:               "HTTP Debug Monitor",
		Kind:               monitor.HTTP,
		Active:             true,
		Interval:           100,
		Timeout:            5,
		Description:        new(string),
		RemoteAddress:      new(string),
		RemotePort:         new(int16),
		ScriptPath:         new(string),
		HTTPRange:          &httpRange,
		HTTPMethod:         new(string),
		HTTPRequestHeaders: new(string),
		HTTPRequestBody:    new(string),
		HTTPExpiredCertMod: new(string),
		ICMPSize:           new(int),
	}
	return monitor
}
