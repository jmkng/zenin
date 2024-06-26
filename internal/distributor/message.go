package distributor

import (
	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// DistributeMeasurementMessage  is used to distribute a `Measurement` to the
// repository and feed subscribers.
type DistributeMeasurementMessage struct {
	Measurement measurement.Measurement
}

// SubscribeMessage is used to add a new feed subscriber.
type SubscribeMessage struct {
	Subscriber *websocket.Conn
}

// UnsubscribeMessage is used to remove an existing feed subscriber,
// and close the connection.
type UnsubscribeMessage struct {
	Id int
}

// StartMessage is used to begin polling a `Monitor`
type StartMessage struct {
	Monitor monitor.Monitor
}

// StopMessage is used to stop polling an active `Monitor`
type StopMessage struct {
	Id int
}

// PollMessage is used to manually trigger a poll action.
type PollMessage struct{}
