package monitor

import (
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/measurement"
)

type Monitor struct {
	Id int
	Strategy
}

func (m Monitor) Poll() measurement.Measurement {
	log.Warn("monitor is returning a blank measurement") // TODO
	return measurement.Measurement{}
}

type Strategy struct {
	Name               string
	Kind               ProbeKind
	Active             bool
	Interval           int
	Timeout            int
	Description        *string
	RemoteAddress      *string
	RemotePort         *int16
	ScriptPath         *string
	HTTPRange          *HTTPRange
	HTTPMethod         string
	HTTPHeaders        *string
	HTTPBody           *string
	HTTPExpiredCertMod *string
	ICMPSize           *int
}
