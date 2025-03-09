FROM golang:1.22-alpine AS builder
RUN apk add --no-cache make git nodejs npm
WORKDIR /build
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN cd web && npm install
RUN make build

FROM alpine:latest
WORKDIR /build
COPY --from=builder /build/zenin .
EXPOSE 50010

# Default repository is a local SQLite database.
ENV ZENIN_DB_KIND="sqlite"
ENV ZENIN_DB_NAME="zenin.db"

CMD ["./zenin"]
