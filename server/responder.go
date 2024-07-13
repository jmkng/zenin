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

	response, err := NewDataResponse(data).JSON()
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

	r.writer.WriteHeader(status)
	if len(client) > 0 {
		response, err := NewErrorResponse(client...).JSON()
		if err != nil {
			log.Error("responder failed to send error response", "error", err)
			return
		}

		r.writer.Write(response)
	} else {
		log.Error(origin.Error())
	}
}

// Status will send a status code.
func (r *Responder) Status(status int) {
	r.writer.WriteHeader(status)
}

// NewErrorResponse returns a new ErrorResponse.
func NewErrorResponse(errors ...string) ErrorResponse {
	return ErrorResponse{
		Errors: errors,
	}
}

// ErrorResponse is used to send a set of user-friendly error messages.
type ErrorResponse struct {
	Errors []string `json:"errors"`
}

// JSON will marshal the `ErrorResponse` as a JSON string, returning the bytes: { "errors": ... }
func (e ErrorResponse) JSON() ([]byte, error) {
	bytes, err := json.Marshal(e)
	if err != nil {
		return bytes, fmt.Errorf("failed to marshal error response: %w", err)
	}
	return bytes, nil
}

// NewDataResponse returns a new DataResponse.
func NewDataResponse(data any) DataResponse {
	return DataResponse{
		Data: data,
	}
}

// DataResponse contains a set of data.
type DataResponse struct {
	Data any `json:"data"`
}

// JSON will marshal the `DataResponse` as a JSON string, returning the bytes: { "data": ... }
func (d DataResponse) JSON() ([]byte, error) {
	bytes, err := json.Marshal(d)
	if err != nil {
		return bytes, fmt.Errorf("failed to marshal data response: %w", err)
	}
	return bytes, err
}
