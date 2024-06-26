package distributor

import (
	"math"
	"math/rand"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
)

// NewDistributor returns a new `Distributor` using the provided `MeasurementService`
// to handle incoming measurements.
func NewDistributor(service measurement.MeasurementService) Distributor {
	return Distributor{
		measurement: service,
		subscribers: map[int]*websocket.Conn{},
		polling:     map[int]chan<- any{},
	}
}

// Distributor handles polling actions, and distributes `Measurement` information.
type Distributor struct {
	// A `MeasurementService` used to handle measurements.
	measurement measurement.MeasurementService

	// A list of active feed subscriber connections.
	subscribers map[int]*websocket.Conn
	// A list of polling monitors, and a channel to contact them.
	polling map[int]chan<- any
}

// Listen will block and listen for incoming messages.
//
// The returned channel can be used to send messages to the `Distributor`.
// It expects to receive a message type defined in `message.go`,
// and unrecognized messages are logged and dropped.
func (d *Distributor) Listen() chan<- any {
	channel := make(chan any, 1)
	go func(in chan any) {
		log.Debug("distributor starting")
		for message := range in {
			switch x := message.(type) {
			case SubscribeMessage:
				d.subscribe(channel, x.Subscriber)
			case UnsubscribeMessage:
				d.unsubscribe(x.Id)
			case StartMessage:
				d.start(channel, x.Monitor)
			case StopMessage:
				d.stop(x.Id)
			case DistributeMeasurementMessage:
				d.distributeMeasurement(x.Measurement)
			default:
				log.Error("distributor dropped unrecognized message: %v", "message", message)
			}
		}
		log.Debug("distributor stopping")
	}(channel)
	return channel
}

// subscribe will add a new feed subscriber.
func (d *Distributor) subscribe(loopback chan<- any, subscriber *websocket.Conn) {
	// TODO: Rethink this later.
	var key int
	for {
		key = rand.Intn(math.MaxInt)
		if _, exists := d.subscribers[key]; !exists {
			break
		}
	}
	d.subscribers[key] = subscriber
	go onClose(subscriber,
		func() { loopback <- UnsubscribeMessage{Id: key} },
		func(err error) { log.Error("distributor failed to read message", "error", err) })
}

// unsubscribe will remove an existing feed subscriber, and close the connection.
func (d *Distributor) unsubscribe(id int) {
	conn := d.subscribers[id]
	if conn == nil {
		log.Debug("distributor dropped no-op unsubscribe request")
		return
	}
	err := conn.Close()
	if err != nil {
		log.Debug("distributor received error while closing feed connection", "error", err) // TODO: Is this logging right?
	}
	delete(d.subscribers, id)
}

// start will begin polling a `Monitor`.
func (d *Distributor) start(loopback chan<- any, mon monitor.Monitor) {
	if _, exists := d.polling[mon.Id]; exists {
		log.Debug("distributor dropped request to start an active monitor", "id", mon.Id)
		return
	}

	channel := make(chan any)
	d.polling[mon.Id] = channel

	log.Debug("distributor started polling monitor", "id", mon.Id)
	go func(in <-chan any, loopback chan<- any, mon monitor.Monitor) {
		// TODO: A small random delay here would help avoid having too many file handles
		// open, in the event that many monitors with the same interval are started all
		// at once.
		interval := time.Duration(mon.Interval)
	POLLING:
		for {
			action := func() {
				measurement := mon.Poll()
				loopback <- DistributeMeasurementMessage{Measurement: measurement}
			}
			select {
			case message, ok := <-in:
				if !ok {
					break POLLING
				}
				switch message.(type) {
				case StopMessage:
					break POLLING
				case PollMessage:
					action()
				}
			case <-time.After(interval * time.Second):
				action()
			}
			log.Debug("distributor stopped polling monitor", "id", mon.Id)
		}
		log.Debug("distributor stopped polling monitor")
	}(channel, loopback, mon)
}

// stop will stop polling an active `Monitor`.
func (d *Distributor) stop(id int) {
	channel, exists := d.polling[id]
	if !exists {
		log.Debug("distributor dropped no-op stop request")
		return
	}
	// This message goes to the monitor thread, not the distributor,
	// but we include the id anyway.
	channel <- StopMessage{Id: id}
	delete(d.polling, id)
}

// Distribute will distribute a `Measurement` to the repository and feed subscribers.
func (d *Distributor) distributeMeasurement(measurement measurement.Measurement) {
	log.Warn("distributor received a measurement but will do nothing with it") // TODO
}

// onClose will block and listen for incoming messages.
// If a close message is received, it will execute the provided function.
func onClose(in *websocket.Conn, onCloseFunc func(), onReadErrFunc func(error)) {
	for {
		mt, _, err := in.ReadMessage()
		if err != nil {
			onReadErrFunc(err)
		}
		if mt != websocket.CloseMessage {
			continue
		}
		onCloseFunc()
	}
}
