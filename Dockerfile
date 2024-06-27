FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN go build -o zenin ./cmd/zenin.go

FROM alpine:latest
WORKDIR /build
COPY --from=builder /build/zenin .
#COPY cert.pem .
#COPY key.pem .
EXPOSE 50010
CMD ["./zenin"]
