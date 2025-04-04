.PHONY: all prepare-dist web run build build-armv7 build-all build-platform test help

VERSION := $(shell git describe --tags --abbrev=0)
COMMIT := $(shell git rev-parse HEAD)

LDFLAGS := \
	-X github.com/jmkng/zenin/internal/env.Commit=$(COMMIT) \
	-X github.com/jmkng/zenin/internal/env.Version=$(VERSION)

BIN_DIR := dist

LINUX_ARMV7_NAME := linux-armv7

all: build

prepare-dist:
	@mkdir -p $(BIN_DIR)

web:
	cd web && npm run build

run: web
	go run -ldflags="$(LDFLAGS)" cmd/zenin.go

build: web prepare-dist
	go build -ldflags="$(LDFLAGS)" -o $(BIN_DIR)/zenin cmd/zenin.go

build-armv7:
	$(MAKE) build-platform GOOS=linux GOARCH=arm GOARM=7 SUFFIX=$(LINUX_ARMV7_NAME)

build-all:
	$(MAKE) build-platform GOOS=linux 	GOARCH=amd64   		  	SUFFIX=linux-amd64
	$(MAKE) build-platform GOOS=linux 	GOARCH=386     	      	SUFFIX=linux-386
	$(MAKE) build-platform GOOS=linux 	GOARCH=arm 	  GOARM=7 	SUFFIX=$(LINUX_ARMV7_NAME)
	$(MAKE) build-platform GOOS=darwin 	GOARCH=amd64  			SUFFIX=macos-amd64
	$(MAKE) build-platform GOOS=darwin 	GOARCH=arm64  			SUFFIX=macos-arm64
	$(MAKE) build-platform GOOS=windows GOARCH=amd64 			SUFFIX=windows-amd64.exe

build-platform: web prepare-dist
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOARM=$(GOARM) \
	go build -ldflags="$(LDFLAGS)" -o $(BIN_DIR)/zenin-$(SUFFIX) cmd/zenin.go

test:
	go test ./...

.DEFAULT_GOAL := help

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  build         - Build for host"
	@echo "  build-armv7   - Build linux/armv7 release binary"
	@echo "  build-all     - Build all release binaries"
	@echo "  run           - Run locally"
	@echo "  test          - Run tests"
	@echo "  web           - Build frontend embed"