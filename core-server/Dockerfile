FROM golang:1.25-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/flynow ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates \
    && addgroup -S flynow \
    && adduser -S -G flynow flynow

COPY --from=build /out/flynow /usr/local/bin/flynow

USER flynow
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/flynow"]
