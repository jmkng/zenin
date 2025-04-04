FROM docker.io/node:18-alpine AS web-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web .
RUN npm run build

FROM golang:1.22-alpine AS builder
RUN apk add --no-cache make git
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web-builder /server/build ./server/build
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