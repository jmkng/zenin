.PHONY: all web run build build-armv7 test

VERSION := $(shell git describe --tags --abbrev=0)
COMMIT := $(shell git rev-parse HEAD)

LDFLAGS := \
	-X github.com/jmkng/zenin/internal/env.Commit=$(COMMIT) \
	-X github.com/jmkng/zenin/internal/env.Version=$(VERSION)

all: build

web:
	cd web && npm run build

run: web
	go run -ldflags="$(LDFLAGS)" cmd/zenin.go

build: web
	go build -ldflags="$(LDFLAGS)" -o zenin cmd/zenin.go

build-armv7: web
	GOOS=linux GOARCH=arm GOARM=7 $(MAKE) build

test:
	go test ./...
