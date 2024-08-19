package monitor

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/jmkng/zenin/internal/measurement"
)

// NewHTTPProbe returns a new `HTTPProbe`
func NewHTTPProbe() HTTPProbe {
	return HTTPProbe{}
}

type HTTPProbe struct{}

// Poll implements `Probe.Poll` for `HTTPProbe`.
func (h HTTPProbe) Poll(m Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)

	requestBody := bytes.NewBuffer([]byte{})
	if m.HTTPRequestBody != nil {
		requestBody = bytes.NewBuffer([]byte(*m.HTTPRequestBody))
	}

	deadline, cancel := m.Deadline(context.Background())
	defer cancel()

	request, err := http.NewRequestWithContext(deadline,
		*m.HTTPMethod,
		*m.RemoteAddress,
		requestBody)
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	if m.HTTPRequestHeaders != nil {
		var requestHeaders map[string]string
		err = json.Unmarshal([]byte(*m.HTTPRequestHeaders), &requestHeaders)
		if err != nil {
			span.Downgrade(measurement.Dead, "Request headers may be invalid.")
			return span
		}

		for key, value := range requestHeaders {
			request.Header.Add(key, value)
		}
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		span.Downgrade(measurement.Dead)
		if errors.Is(err, context.DeadlineExceeded) {
			span.Hint(TimeoutMessage)
		}
		return span
	}
	defer response.Body.Close()

	span.HTTPStatusCode = &response.StatusCode
	responseRange := newHTTPRangeFromInt(response.StatusCode)
	if responseRange != *m.HTTPRange {
		span.Downgrade(measurement.Dead, "Response status code was out of range.")
	}

	if m.HTTPCaptureHeaders != nil && *m.HTTPCaptureHeaders {
		responseHeaders, err := json.Marshal(response.Header)
		if err != nil {
			span.Downgrade(measurement.Warn, "Response headers could not be serialized.")
		} else {
			headersString := string(responseHeaders)
			span.HTTPResponseHeaders = &headersString
		}
	}
	if m.HTTPCaptureBody != nil && *m.HTTPCaptureBody {
		responseBody, err := io.ReadAll(response.Body)
		if err != nil {
			span.Downgrade(measurement.Warn, "Response body could not be read.")
		} else {
			bodyString := string(responseBody)
			span.HTTPResponseBody = &bodyString
		}
	}

	if response.TLS != nil {
		for _, n := range response.TLS.PeerCertificates {
			c := measurement.Certificate{
				Id:                 nil,
				MeasurementId:      nil,
				Version:            n.Version,
				SerialNumber:       n.SerialNumber.String(),
				PublicKeyAlgorithm: n.PublicKeyAlgorithm.String(),
				IssuerCommonName:   n.Issuer.CommonName,
				SubjectCommonName:  n.Subject.CommonName,
				NotBefore:          n.NotBefore,
				NotAfter:           n.NotAfter,
			}
			span.Certificates = append(span.Certificates, c)
		}
	}

	return span
}

func newHTTPRangeFromInt(value int) HTTPRange {
	if value >= 100 && value < 200 {
		return Informational
	} else if value >= 200 && value < 300 {
		return Successful
	} else if value >= 300 && value < 400 {
		return Redirection
	} else if value >= 400 && value < 500 {
		return ClientError
	}
	return ServerError
}
