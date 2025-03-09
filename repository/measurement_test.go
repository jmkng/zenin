package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/debug"
	"github.com/jmkng/zenin/internal/measurement"
)

func TestInsertMeasurement(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	mid := 4
	code := 200
	nb := internal.NewTimeValue(time.Now())
	na := internal.NewTimeValue(time.Now().Add(time.Hour * 48))
	measurement := measurement.Measurement{
		MonitorId: &mid,
		Duration:  100,
		Span: measurement.Span{
			State: measurement.Ok,
			Kind:  measurement.HTTP,
			HTTPFields: measurement.HTTPFields{
				HTTPStatusCode:      &code,
				HTTPResponseHeaders: nil,
				HTTPResponseBody:    nil,
			},
			Certificates: []measurement.Certificate{
				{
					MeasurementId:      &mid,
					Version:            100,
					SerialNumber:       "abc",
					PublicKeyAlgorithm: "def",
					IssuerCommonName:   "ghi",
					SubjectCommonName:  "jkl",
					NotBefore:          nb,
					NotAfter:           na,
				},
			},
		},
	}
	id, err := repository.InsertMeasurement(ctx, measurement)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, id, 8)

	after, err := repository.SelectCertificate(ctx, id)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(after), 1)
}

func TestDeleteMeasurement(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()

	id := 4
	before, err := repository.SelectCertificate(ctx, id)
	if err != nil {
		t.Fatalf("expected test fixture with 3 certificates: %v", err)
	}

	debug.AssertEqual(t, len(before), 3)

	err = repository.DeleteMeasurement(ctx, []int{id})
	if err != nil {
		t.Fatal(err)
	}

	after, err := repository.SelectCertificate(ctx, id)
	if err != nil {
		t.Fatalf("expected related foreign keys to be deleted: %v", err)
	}

	debug.AssertEqual(t, len(after), 0)
}

func TestSelectCertificate(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	certificates, err := repository.SelectCertificate(ctx, 4)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(certificates), 3)
}
