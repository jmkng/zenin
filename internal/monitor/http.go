package monitor

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"

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
	span := measurement.NewSpan()

	// Check remote address.
	result, err := url.Parse(*m.RemoteAddress)
	if err != nil || result.Scheme == "" || result.Scheme != "http" && result.Scheme != "https" {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		return span
	}
	// The `net.LookupHost` method will handle both IP and hostname.
	// If you do pass a hostname and DNS resolution fails, the user will see an "invalid address" hint.
	// This might be confusing, because the address may technically be valid -- so add another hint.
	_, err = net.LookupHost(result.Host)
	if err != nil {
		span.Downgrade(measurement.Dead, RemoteAddressInvalidMessage)
		span.Hint("Remote address DNS name resolution failed.")
		return span
	}

	requestBody := bytes.NewBuffer([]byte{})
	if m.HTTPRequestBody != nil {
		requestBody = bytes.NewBuffer([]byte(*m.HTTPRequestBody))
	}

	request, err := http.NewRequestWithContext(ctx, *m.HTTPMethod, *m.RemoteAddress, requestBody)
	if err != nil {
		// No hint, because after reviewing the source code for `NewRequestWithContext`,
		// it seems the only time this could fail in our use case would be the internal call to `url.Parse`,
		// which we already performed above.
		span.Downgrade(measurement.Dead)
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
	switch {
	case c >= 100 && c < 200:
		responseRange = Informational
	case c >= 200 && c < 300:
		responseRange = Successful
	case c >= 300 && c < 400:
		responseRange = Redirection
	case c >= 400 && c < 500:
		responseRange = ClientError
	default:
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
