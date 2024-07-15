package monitor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/jmkng/zenin/internal/log"
	"github.com/jmkng/zenin/internal/measurement"
)

// NewHTTPProbe returns a new `HTTPProbe`
func NewHTTPProbe() HTTPProbe {
	return HTTPProbe{}
}

type HTTPProbe struct{}

// Poll implements `Probe.Poll` for `HTTPProbe`.
func (h HTTPProbe) Poll(monitor Monitor) (measurement.Span, error) {
	state := measurement.Ok
	var span measurement.Span

	if monitor.HTTPMethod == nil || !isValidMethod(monitor.HTTPMethod) {
		return span, fmt.Errorf("%w: http monitor has missing or invalid method", ValidationError)
	}
	method := *monitor.HTTPMethod
	if monitor.RemoteAddress == nil {
		return span, fmt.Errorf("%w: http monitor has missing or invalid remote address", ValidationError)
	}
	url := *monitor.RemoteAddress
	var reqBody *bytes.Buffer
	if monitor.HTTPRequestBody != nil {
		reqBody = bytes.NewBuffer([]byte(*monitor.HTTPRequestBody))
	} else {
		reqBody = bytes.NewBuffer([]byte{})
	}

	request, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return span, fmt.Errorf("%w: http monitor failed to build request", ValidationError)
	}

	if span.HTTPResponseHeaders != nil {
		var reqHeaders map[string]string
		err = json.Unmarshal([]byte(*monitor.HTTPRequestHeaders), &reqHeaders)
		if err != nil {
			return span, fmt.Errorf("%w: failed to parse http headers", ValidationError)
		}
		for key, value := range reqHeaders {
			request.Header.Add(key, value)
		}
	}

	client := &http.Client{
		Transport:     nil,
		CheckRedirect: nil,
		Jar:           nil,
		Timeout:       time.Duration(monitor.Timeout) * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		var hint *measurement.StateHint
		if e, ok := err.(net.Error); ok && e.Timeout() {
			t := measurement.Timeout
			hint = &t
		} else {
			log.Info("http probe request failed", "error", err)
		}
		span.State = measurement.Dead
		span.StateHint = hint
		return span, nil
	}
	defer response.Body.Close()

	resRange := newHTTPRangeFromInt(response.StatusCode)
	span.HTTPStatusCode = &response.StatusCode
	if resRange != *monitor.HTTPRange {
		state = measurement.Dead
	}
	resHeaders, err := json.Marshal(response.Header)
	if err != nil {
		log.Warn("failed to parse and store response headers", "id", *monitor.Id)
	} else {
		headersString := string(resHeaders)
		span.HTTPResponseHeaders = &headersString
	}

	// TODO: Capturing body/headers should be opt-in, since they take up space
	// and may not be needed.
	resbody, err := io.ReadAll(response.Body)
	if err != nil {
		log.Warn("failed to read response body", "id", monitor.Id)
	} else {
		bodystring := string(resbody)
		span.HTTPResponseBody = &bodystring
	}

	if response.TLS != nil {
		var certificates []measurement.Certificate
		for _, n := range response.TLS.PeerCertificates {
			var c measurement.Certificate
			c.Version = n.Version
			c.SerialNumber = n.SerialNumber.String()
			c.PublicKeyAlgorithm = n.PublicKeyAlgorithm.String()
			c.IssuerCommonName = n.Issuer.String()
			c.SubjectCommonName = n.Subject.CommonName
			c.NotBefore = n.NotBefore
			c.NotAfter = n.NotAfter
			certificates = append(certificates, c)
		}
		span.Certificates = certificates
	}

	span.State = state
	return span, nil
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
