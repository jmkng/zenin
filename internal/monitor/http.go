package monitor

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/measurement"
)

// NewHTTPProbe returns a new `HTTPProbe`
func NewHTTPProbe() HTTPProbe {
	return HTTPProbe{}
}

type HTTPProbe struct{}

// Poll implements `Probe.Poll` for `HTTPProbe`.
func (h HTTPProbe) Poll(ctx context.Context, m Monitor) measurement.Span {
	span := measurement.NewSpan(measurement.Ok)

	requestBody := bytes.NewBuffer([]byte{})
	if m.HTTPRequestBody != nil {
		requestBody = bytes.NewBuffer([]byte(*m.HTTPRequestBody))
	}

	request, err := http.NewRequestWithContext(ctx, *m.HTTPMethod, *m.RemoteAddress, requestBody)
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}

	if m.HTTPRequestHeaders != nil {
		for _, pair := range *m.HTTPRequestHeaders {
			request.Header.Add(pair.Key, pair.Value)
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
	c := response.StatusCode

	var responseRange string
	if c >= 100 && c < 200 {
		responseRange = Informational
	} else if c >= 200 && c < 300 {
		responseRange = Successful
	} else if c >= 300 && c < 400 {
		responseRange = Redirection
	} else if c >= 400 && c < 500 {
		responseRange = ClientError
	} else {
		responseRange = ServerError
	}

	if responseRange != *m.HTTPRange {
		span.Downgrade(measurement.Dead, "Response status code was out of range.")
	}

	if m.HTTPCaptureHeaders != nil && *m.HTTPCaptureHeaders {
		var headers internal.PairListValue
		for k, v := range response.Header {
			for _, x := range v {
				headers = append(headers, internal.PairValue{Key: k, Value: x})
			}
		}
		span.HTTPResponseHeaders = &headers
	}

	if m.HTTPCaptureBody != nil && *m.HTTPCaptureBody {
		responseBody, err := io.ReadAll(response.Body)
		if err != nil {
			span.Downgrade(measurement.Warn, "Response body could not be read.")
		} else {
			s := string(responseBody)
			span.HTTPResponseBody = &s
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
