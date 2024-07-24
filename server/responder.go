package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/log"
)

// NewResponder returns a new `Responder`.
func NewResponder(w http.ResponseWriter) Responder {
	return Responder{
		writer: w,
	}
}

// Responder is a wrapper for `ResponseWriter` that handles formatting
// server responses.
type Responder struct {
	writer http.ResponseWriter
}

// Data will send a status code and a chunk of data.
func (r *Responder) Data(data any, status int) {
	r.writer.WriteHeader(status)

	response, err := NewDataPacket(data).JSON()
	if err != nil {
		log.Error("responder failed to send data response", "error", err)
		return
	}
	r.writer.Write(response)
}

// Error will send a status code and search the error chain for `Validation` errors.
//
// If any are found, the messages are extracted and sent to the client.
// If none are found, the error is logged.
func (r *Responder) Error(err error, status int) {
	r.writer.WriteHeader(status)

	var client []string
	origin := err

	for {
		if err == nil {
			break
		}
		validation, ok := err.(internal.Validation)
		if ok {
			client = append(client, validation.Messages()...)
		}
		err = errors.Unwrap(err)
	}

	if len(client) > 0 {
		response, err := NewErrorPacket(client...).JSON()
		if err != nil {
			log.Error("responder failed to send error response", "error", err)
			return
		}

		r.writer.Write(response)
	}

	log.Error(origin.Error())
}

// Status will send a status code.
func (r *Responder) Status(status int) {
	r.writer.WriteHeader(status)
}

// NewErrorPacket returns a new `ErrorPacket`.
func NewErrorPacket(errors ...string) ErrorPacket {
	return ErrorPacket{
		Errors: errors,
	}
}

// ErrorPacket is used to send a set of user-friendly error messages.
type ErrorPacket struct {
	Errors []string `json:"errors"`
}

// JSON will marshal the `ErrorPacket` as a JSON string, returning the bytes: { "errors": ... }
func (e ErrorPacket) JSON() ([]byte, error) {
	bytes, err := json.Marshal(e)
	if err != nil {
		return bytes, fmt.Errorf("failed to marshal error response: %w", err)
	}
	return bytes, nil
}

// NewDataPacket returns a new `DataPacket`.
func NewDataPacket(data any) DataPacket {
	return DataPacket{
		Data: data,
	}
}

// DataPacket contains a set of data.
type DataPacket struct {
	Data any `json:"data"`
}

// JSON will marshal the `DataPacket` as a JSON string, returning the bytes: { "data": ... }
func (d DataPacket) JSON() ([]byte, error) {
	bytes, err := json.Marshal(d)
	if err != nil {
		return bytes, fmt.Errorf("failed to marshal data response: %w", err)
	}
	return bytes, err
}
