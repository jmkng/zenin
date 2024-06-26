package monitor

type ProbeKind string

const (
	HTTP ProbeKind = "HTTP"
	TCP  ProbeKind = "TCP"
	Ping ProbeKind = "PING"
	ICMP ProbeKind = "ICMP"
)
