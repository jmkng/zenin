package monitor

import (
	"context"
	"encoding/json"
	"math"
	"math/rand/v2"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/measurement"
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
	// A list of active feed subscriber connections.
	subscribers map[int]*websocket.Conn
	// A list of polling monitors, and a channel to contact them.
	polling map[int]chan<- any

	// A `MeasurementService` used to handle measurements.
	measurement measurement.MeasurementService
}

// Listen will block and listen for incoming messages.
//
// Returns a channel that can be used to send messages to the `Distributor`.
//
// The channel should be sent a message type that is defined `message.go`.
// Unrecognized messages are logged and dropped.
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
			case MeasurementMessage:
				d.distributeMeasurement(channel, x.Measurement)
			case PollMessage:
				if monitor, ok := d.polling[*x.Monitor.Id]; ok {
					monitor <- x
				} else {
					go d.poll(channel, x.Monitor)
				}
			default:
				log.Debug("distributor dropped unrecognized message: %v", "message", message)
			}
		}

		log.Debug("distributor stopping")
	}(channel)

	return channel
}

// subscribe will add a new feed subscriber.
func (d *Distributor) subscribe(loopback chan<- any, subscriber *websocket.Conn) {
	// todo Rethink this later.
	var key int
	for {
		key = rand.IntN(math.MaxInt)
		if _, exists := d.subscribers[key]; !exists {
			break
		}
	}
	log.Debug("distributor added feed subscriber", "subscriber(id)", key)
	d.subscribers[key] = subscriber

	// Listen for stop message.
	go func() {
		for {
			kind, message, err := subscriber.ReadMessage()
			if err != nil {
				log.Error("distributor discarding broken feed subscriber connection", "subscriber(id)", key)
				loopback <- UnsubscribeMessage{Id: key}
				break
			} else if kind == websocket.CloseMessage {
				log.Debug("distributor closed feed subscriber connection", "subscriber(id)", key)
				loopback <- UnsubscribeMessage{Id: key}
				break
			} else {
				log.Info("distributor received feed message", "subscriber(id)", key, "message", string(message))
			}
		}
	}()
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
		log.Debug("distributor failed to close feed subscriber connection", "subscriber(id)", id, "error", err)
	}
	delete(d.subscribers, id)
}

// start will begin polling a `Monitor` in a loop based on the interval.
func (d *Distributor) start(loopback chan<- any, mon Monitor) {
	if _, exists := d.polling[*mon.Id]; exists {
		log.Debug("distributor dropped request to start an active monitor", "monitor(id)", *mon.Id)
		return
	}
	channel := make(chan any)
	d.polling[*mon.Id] = channel

	go func(loopback chan<- any, in <-chan any, mon Monitor) {
		delay := rand.IntN(800)
		log.Debug("distributor started polling monitor", "monitor(id)", *mon.Id, "delay(ms)", delay)
		time.Sleep(time.Duration(delay) * time.Millisecond)
	POLLING:
		for {
			select {
			case message, ok := <-in:
				if !ok {
					log.Warn("distributor is exiting due to closed inbound channel")
					break POLLING
				}

				switch message.(type) {
				case StopMessage:
					log.Debug("monitor received stop signal", "monitor(id)", *mon.Id)
					break POLLING
				case PollMessage:
					go d.poll(loopback, mon)
				}
			case <-time.After(time.Duration(mon.Interval) * time.Second):
				go d.poll(loopback, mon)
			}
		}

		log.Debug("distributor stopped polling monitor", "monitor(id)", *mon.Id)
	}(loopback, channel, mon)
}

// poll will begin polling a `Monitor`.
func (d *Distributor) poll(loopback chan<- any, m Monitor) {
	measurement := m.Poll()
	loopback <- MeasurementMessage{
		Measurement: measurement,
	}
}

// stop will stop polling an active `Monitor`.
func (d *Distributor) stop(id int) {
	channel, exists := d.polling[id]
	if !exists {
		log.Warn("distributor dropped no-op stop request")
		return
	}

	// This message goes to the monitor thread, not the distributor,
	// but we include the id anyway.
	channel <- StopMessage{Id: id}
	delete(d.polling, id)
}

// distributeMeasurement will distribute a `Measurement` to the repository and feed subscribers.
func (d *Distributor) distributeMeasurement(loopback chan<- any, m measurement.Measurement) {
	id, err := d.measurement.Repository.InsertMeasurement(context.Background(), m)
	if err != nil {
		log.Error("distributor failed to send measurement to repository (aborted distribution)",
			"error", err)
		return
	}
	m.Id = &id
	log.Info("distributing measurement",
		"measurement(id)", id,
		"subscribers(count)", len(d.subscribers))

	message, err := json.Marshal(m)
	if err != nil {
		log.Error("distributor failed to serialize measurement (aborted distribution)",
			"measurement", m, "error", err)
		return
	}
	discard := []int{}
	for i, v := range d.subscribers {
		err := v.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			discard = append(discard, i)
			log.Warn("distributor failed to send message to feed subscriber (discarding connection)")
		}
	}
	for _, v := range discard {
		log.Error("distributor discarding broken feed subscriber connection",
			"subscriber(id)", v)
		loopback <- UnsubscribeMessage{Id: v}
	}
}
