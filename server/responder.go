package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/jmkng/zenin/internal/env"
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

// Data will send a [DataPacket] and status code.
func (r *Responder) Data(data any, status int) {
	r.writer.Header().Add(ContentType, ContentTypeApplicationJson)
	r.writer.WriteHeader(status)

	response, err := NewDataPacket(data).JSON()
	if err != nil {
		env.Error("responder failed to send data response", "error", err)
		return
	}
	r.writer.Write(response)
}

// HTML will send HTML and a status code.
func (r *Responder) HTML(data []byte, status int) {
	r.writer.Header().Add(ContentType, ContentTypeTextHtmlUTF8)
	r.writer.WriteHeader(status)

	_, err := r.writer.Write(data)
	if err != nil {
		env.Error("responder failed to send html response", "error", err)
		return
	}
}

// HTML will send CSS and a status code.
func (r *Responder) CSS(data []byte, status int) {
	r.writer.Header().Add(ContentType, ContentTypeCSS)
	r.writer.WriteHeader(status)

	_, err := r.writer.Write(data)
	if err != nil {
		env.Error("responder failed to send css response", "error", err)
		return
	}
}

// Error will send an [ErrorPacket] if the error includes [env.Validation] errors.
// All other errors are logged.
func (r *Responder) Error(err error, status int) {
	var client []string
	origin := err

	for {
		if err == nil {
			break
		}
		validation, ok := err.(env.Validation)
		if ok {
			client = append(client, validation.Messages()...)
		}
		err = errors.Unwrap(err)
	}

	if len(client) > 0 {
		r.writer.Header().Add(ContentType, ContentTypeApplicationJson)
	}
	r.writer.WriteHeader(status)
	if len(client) > 0 {
		response, err := NewErrorPacket(client...).JSON()
		if err != nil {
			env.Error("responder failed to send error response", "error", err)
			return
		}
		r.writer.Write(response)
	}

	env.Error(origin.Error())
}

// Example will send an [ExamplePacket] and a 400 status code.
func (r *Responder) Example(example map[string]any, errors ...string) {
	r.writer.Header().Add(ContentType, ContentTypeApplicationJson)
	r.writer.WriteHeader(http.StatusBadRequest)

	packet := NewExamplePacket(example, errors...)
	response, err := packet.JSON()
	if err != nil {
		env.Error("responder failed to serialize response", "error", err)
		return
	}

	if _, err = r.writer.Write(response); err != nil {
		env.Error("responder failed to write response", "error", err)
	}
}

// Redirect will set a location header and send a status code.
func (r *Responder) Redirect(location string, status int) {
	r.writer.Header().Add(Location, location)
	r.writer.WriteHeader(http.StatusMovedPermanently)
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
		return bytes, fmt.Errorf("failed to marshal error packet: %w", err)
	}
	return bytes, nil
}

// NewExamplePacket returns a new `ExamplePacket` containing error messages and example data.
func NewExamplePacket(example map[string]any, errors ...string) ExamplePacket {
	return ExamplePacket{
		ErrorPacket: NewErrorPacket(errors...),
		Example:     example,
	}
}

// ExamplePacket is used to send an [ErrorPacket] and example data.
type ExamplePacket struct {
	ErrorPacket
	Example map[string]any `json:"example"`
}

// JSON will marshal the `ExamplePacket` as a JSON string, returning the bytes: { "errors": ..., "example": ... }
func (e ExamplePacket) JSON() ([]byte, error) {
	bytes, err := json.Marshal(e)
	if err != nil {
		return bytes, fmt.Errorf("failed to marshal example packet: %w", err)
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
