package monitor

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/jmkng/zenin/internal/measurement"
)

// NewHTTPProbe returns a new `HTTPProbe`
func NewHTTPProbe() HTTPProbe {
	return HTTPProbe{}
}

type HTTPProbe struct{}

// Poll implements `Probe.Poll` for `HTTPProbe`.
func (h HTTPProbe) Poll(monitor Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)

	var requestBody *bytes.Buffer
	if monitor.HTTPRequestBody != nil {
		requestBody = bytes.NewBuffer([]byte(*monitor.HTTPRequestBody))
	} else {
		requestBody = bytes.NewBuffer([]byte{})
	}

	request, err := http.NewRequest(*monitor.HTTPMethod, *monitor.RemoteAddress, requestBody)
	if err != nil {
		span.Downgrade(measurement.Dead, "Field `remote address` may be invalid.")
		return span
	}

	if monitor.HTTPRequestHeaders != nil {
		var requestHeaders map[string]string
		err = json.Unmarshal([]byte(*monitor.HTTPRequestHeaders), &requestHeaders)
		if err != nil {
			span.Downgrade(measurement.Dead, "Field `request headers` may be invalid.")
			return span
		}
		for key, value := range requestHeaders {
			request.Header.Add(key, value)
		}
	}

	client := &http.Client{
		Timeout: time.Duration(monitor.Timeout) * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		span.Downgrade(measurement.Dead)
		if e, ok := err.(net.Error); ok && e.Timeout() {
			span.Hint("The monitor timed out.")
		}
		return span
	}
	defer response.Body.Close()

	span.HTTPStatusCode = &response.StatusCode

	responseRange := newHTTPRangeFromInt(response.StatusCode)
	if responseRange != *monitor.HTTPRange {
		span.Downgrade(measurement.Dead, "The response status code is out of range.")
	}

	responseHeaders, err := json.Marshal(response.Header)
	if err != nil {
		span.Downgrade(measurement.Ok,
			"The response headers were unable to be serialized, and were not captured for this measurement.")
	} else {
		headersString := string(responseHeaders)
		span.HTTPResponseHeaders = &headersString
	}

	// TODO: Capturing body/headers should be opt-in, since they take up space
	// and may not be needed.
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		span.Downgrade(measurement.Ok,
			"The response body was unable to be read, and was not captured for this measurement.")
	} else {
		bodyString := string(responseBody)
		span.HTTPResponseBody = &bodyString
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

func isValidMethod(value *string) bool {
	if value == nil {
		return false
	}
	v := *value
	if v == Get || v == Head || v == Post || v == Put || v == Patch || v == Delete {
		return true
	}
	return false
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
	} else if value >= 500 && value < 600 {
		return ServerError
	}
	panic("unrecognized status code")
}
