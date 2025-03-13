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
RUN adduser -D zenin
RUN apk add --no-cache bash zsh
WORKDIR /build
COPY --from=builder /build/zenin .
EXPOSE 23111

ENV SHELL="sh"
ENV ZENIN_REPO_KIND="sqlite"
ENV ZENIN_REPO_NAME="zenin.db"

CMD ["./zenin"]