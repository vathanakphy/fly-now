# Architecture

## Summary

FlyNow Core is a Go backend for a self-hosted platform as a service. Its design
keeps business rules independent from CLI, HTTP, GORM, and PostgreSQL details.

## Current running system

```text
cmd/server
    |
    +-- config.Load
    +-- slog JSON logger
    +-- database.New
    +-- server.New
            |
            +-- GET /health --> PostgreSQL Ping
```

`cmd/server/main.go` is the current composition root: it creates infrastructure
dependencies, starts the HTTP server, and coordinates graceful shutdown.
It does not change the database schema.

Migrations use a separate one-off process:

```text
operator/deployment
       |
       v
cmd/migrate
  |-- config.Load
  |-- database.New
  `-- migrations.Run --> PostgreSQL --> exit
```

This follows the same operational pattern as Django's explicit `migrate`
command: application startup and schema deployment are separate actions.

## Application-management structure

```text
future cmd/flynow
       |
       v
application.Service --------> secret.Box
       |                        (Encryptor)
       v
application.Store interface
       ^
       |
store.GORM -----------------> PostgreSQL
```

Dependencies point inward:

- The CLI may depend on the application service.
- The service owns and depends on the `Store` and `Encryptor` interfaces.
- GORM and AES-GCM implementations satisfy those interfaces.
- Domain types do not import database or CLI packages.

This allows another interface, such as REST or gRPC, to reuse the same service
without moving business rules.

## Package responsibilities

| Package | Responsibility |
|---|---|
| `cmd/server` | Server startup and graceful shutdown |
| `cmd/migrate` | Explicit one-off migration execution |
| `internal/config` | Typed environment configuration and validation |
| `internal/database` | PostgreSQL/GORM connection ownership |
| `internal/database/migrations` | Embedded transactional migrations |
| `internal/server` | HTTP server and health endpoint |
| `internal/application` | Dockerfile-only domain types, inputs, rules, errors, and service |
| `internal/application/store` | GORM records and PostgreSQL repository |
| `internal/secret` | AES-GCM encryption implementation |

## Planned runtime architecture

The root README plans a short-lived CLI for user commands and a separate worker
for deployments:

```text
flynow deploy
    |
    +-- PostgreSQL transaction: deployment + outbox event
                                      |
                                      v
                              RabbitMQ publisher
                                      |
                                      v
                              flynow-worker
```

This is planned design, not current implementation.
