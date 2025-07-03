.PHONY: generate test run, build, build-armv7, build-all, build-platform, help

.DEFAULT_GOAL := help

generate:
	go generate ./...

test: generate
	go test -race ./...

run:
	go run -ldflags="$(LDFLAGS)" ./cmd/zenin/... $(ARGS)

build:
	go build -ldflags="$(LDFLAGS)" -o zenin ./cmd/zenin/...

build-armv7:
	$(MAKE) build-platform GOOS=linux GOARCH=arm GOARM=7 SUFFIX=$(LINUX_ARMV7_NAME)

build-all:
	$(MAKE) build-platform GOOS=linux 	GOARCH=amd64   		  	SUFFIX=linux-amd64
	$(MAKE) build-platform GOOS=linux   GOARCH=arm64 			SUFFIX=linux-arm64
	$(MAKE) build-platform GOOS=linux 	GOARCH=arm 	  GOARM=7 	SUFFIX=$(LINUX_ARMV7_NAME)
	$(MAKE) build-platform GOOS=darwin 	GOARCH=amd64  			SUFFIX=macos-amd64
	$(MAKE) build-platform GOOS=darwin 	GOARCH=arm64  			SUFFIX=macos-arm64
	$(MAKE) build-platform GOOS=windows GOARCH=amd64 			SUFFIX=windows-amd64.exe

build-platform:
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOARM=$(GOARM) \
	go build -ldflags="$(LDFLAGS)" -o zenin-$(SUFFIX) ./cmd/zenin/...

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  generate 	   - Generate files"
	@echo "  test          - Run tests"
	@echo "  run           - Run locally"
	@echo "  build         - Build for host"
	@echo "  build-armv7   - Build linux/armv7 release binary"
	@echo "  build-all     - Build all release binaries"
