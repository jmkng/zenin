package monitor

import (
	"context"
	"encoding/json"
	"math"
	"math/rand/v2"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jmkng/zenin/internal/env"
	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/settings"
)

// NewDistributor returns a new `Distributor`.
func NewDistributor(m1 measurement.MeasurementService, m2 settings.Settings) Distributor {
	return Distributor{
		subscribers: map[int]*websocket.Conn{},
		polling:     map[int]chan<- any{},
		measurement: m1,
		settings:    m2,
	}
}

// Distributor handles polling actions, and distributes `Measurement` information.
type Distributor struct {
	// A list of active feed subscriber connections.
	subscribers map[int]*websocket.Conn
	// A list of polling monitors, and a channel to contact them.
	polling map[int]chan<- any

	measurement measurement.MeasurementService
	settings    settings.Settings
}

// Listen will block and listen for incoming messages.
func (d *Distributor) Listen(s chan any) {
	env.Debug("distributor starting")

	for message := range s {
		switch x := message.(type) {
		case SubscribeMessage:
			d.subscribe(s, x.Subscriber)
		case UnsubscribeMessage:
			d.unsubscribe(x.Id)
		case StartMessage:
			d.start(s, x.Monitor)
		case StopMessage:
			d.stop(x.Id)
		case MeasurementMessage:
			d.distributeMeasurement(s, x.Measurement)
		case PollMessage:
			if monitor, ok := d.polling[*x.Monitor.Id]; ok {
				monitor <- x
			} else {
				go d.poll(s, x.Monitor)
			}
		case settings.SettingsMessage:
			d.settings = x.Settings
		default:
			env.Debug("distributor dropped unrecognized message: %v", "message", message)
		}
	}

	env.Debug("distributor stopping")
}

// subscribe will add a new feed subscriber.
func (d *Distributor) subscribe(loopback chan<- any, subscriber *websocket.Conn) {
	var key int
	for {
		key = rand.IntN(math.MaxInt)
		if _, exists := d.subscribers[key]; !exists {
			break
		}
	}

	env.Debug("distributor adding feed subscriber", "subscriber(id)", key)
	d.subscribers[key] = subscriber

	// Listen for stop message.
	go func() {
		for {
			kind, message, err := subscriber.ReadMessage()
			if err != nil {
				env.Debug("distributor discarding broken feed subscriber connection", "subscriber(id)", key)
				loopback <- UnsubscribeMessage{Id: key}
				break
			} else if kind == websocket.CloseMessage {
				env.Debug("distributor closing feed subscriber connection", "subscriber(id)", key)
				loopback <- UnsubscribeMessage{Id: key}
				break
			} else {
				env.Debug("distributor received feed message", "subscriber(id)", key, "message", string(message))
			}
		}
	}()
}

// unsubscribe will remove an existing feed subscriber, and close the connection.
func (d *Distributor) unsubscribe(id int) {
	conn := d.subscribers[id]
	if conn == nil {
		env.Debug("distributor dropped no-op unsubscribe request")
		return
	}

	err := conn.Close()
	if err != nil {
		env.Debug("distributor failed to close feed subscriber connection", "subscriber(id)", id, "error", err)
	}
	delete(d.subscribers, id)
}

// start will begin polling a `Monitor` in a loop based on the interval.
func (d *Distributor) start(loopback chan<- any, mon Monitor) {
	if _, exists := d.polling[*mon.Id]; exists {
		env.Debug("distributor dropped request to start an active monitor", "monitor(id)", *mon.Id)
		return
	}
	channel := make(chan any)
	d.polling[*mon.Id] = channel

	go func(loopback chan<- any, in <-chan any, mon Monitor) {
		delay := rand.IntN(800)
		env.Debug("distributor started polling monitor", "monitor(id)", *mon.Id, "delay(ms)", delay)
		time.Sleep(time.Duration(delay) * time.Millisecond)

	POLLING:
		for {
			select {
			case message, ok := <-in:
				if !ok {
					env.Warn("distributor is exiting due to closed inbound channel")
					break POLLING
				}

				switch message.(type) {
				case StopMessage:
					break POLLING
				case PollMessage:
					go d.poll(loopback, mon)
				}
			case <-time.After(time.Duration(mon.Interval) * time.Second):
				go d.poll(loopback, mon)
			}
		}

		env.Debug("distributor stopped polling monitor", "monitor(id)", *mon.Id)
	}(loopback, channel, mon)
}

// poll will begin polling a `Monitor`.
func (d *Distributor) poll(loopback chan<- any, m Monitor) {
	measurement := m.Poll(d.settings)
	loopback <- MeasurementMessage{
		Measurement: measurement,
	}
}

// stop will stop polling an active `Monitor`.
func (d *Distributor) stop(id int) {
	channel, exists := d.polling[id]
	if !exists {
		env.Debug("distributor dropped no-op stop request")
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
		env.Error("distributor failed to send measurement to repository (aborted distribution)", "error", err)
		return
	}
	m.Id = &id
	env.Info("distributing measurement", "measurement(id)", id, "subscribers(count)", len(d.subscribers))

	message, err := json.Marshal(m)
	if err != nil {
		env.Error("distributor failed to serialize measurement (aborted distribution)", "measurement", m, "error", err)
		return
	}
	discard := []int{}
	for i, v := range d.subscribers {
		err := v.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			discard = append(discard, i)
		}
	}
	for _, v := range discard {
		env.Debug("distributor discarding broken feed subscriber connection", "subscriber(id)", v)
		loopback <- UnsubscribeMessage{Id: v}
	}
}
