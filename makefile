.PHONY: all web run build

VERSION := 1.0.0
COMMIT := $(shell git rev-parse HEAD)
LDFLAGS := \
	-X github.com/jmkng/zenin/internal/env.Commit=$(COMMIT) \
	-X github.com/jmkng/zenin/internal/env.Version=$(VERSION)

all: build

web:
	cd web && npm run build

run:
	go run -ldflags="$(LDFLAGS)" cmd/zenin.go

build: web
	go build -ldflags="$(LDFLAGS)" -o zenin cmd/zenin.go