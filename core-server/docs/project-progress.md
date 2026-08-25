# Project Progress

## Summary

The foundation is implemented and Stage 2 is in progress. The internal
application core is mostly present, but users cannot operate it until the CLI
and encryption configuration are connected.

## Stage assessment

| Area | Status | Evidence or gap |
|---|---|---|
| Project foundation | Complete in code | Config, logging, PostgreSQL, explicit migration command, health, shutdown, Docker Compose, unit tests |
| Domain model | Complete for current scope | Dockerfile-only container config, separate inputs, lifecycle values |
| Database schema | Partial | Docker-only migration and path/port constraints exist; other constraints and integration tests remain |
| PostgreSQL repository | Mostly complete | Docker container mappings, CRUD, transactions, and error mappings exist; integration tests remain |
| Application service | Mostly complete | Dockerfile configuration rules and operations exist; no executable wiring or source-time file check |
| Environment encryption | Partial | AES-GCM exists; configuration and rotation are missing |
| CLI | Not started | `cmd/flynow` and command parsing are absent |
| Container runtime and later stages | Not started | Correctly deferred by the plan |

## Verification performed

At the time this documentation was created, these commands passed:

```text
go test ./...
go vet ./...
docker compose config --quiet
```

A live Compose startup, health request, persistence restart, and graceful-stop
test were not performed. Therefore the complete Stage 1 runtime exit criteria
still need an environment-level verification.

## Remaining repository verification

Application/environment not-found mappings and persistence error context have
been corrected. Repository behavior and migration `000003` still require tests
against a real PostgreSQL instance.

## Recommended next order

1. Add PostgreSQL migration and repository integration tests.
2. Add typed encryption key and key-version configuration.
3. Create `cmd/flynow` and wire repository, encryptor, and service.
4. Implement application and environment CLI commands.
5. Test parsing, exit codes, secret masking, persistence, and rollback.
6. Review remaining database constraints in a new migration.

Stage 2 is complete only when the CLI can manage applications across process and
container restarts, secrets are encrypted at rest, invalid operations fail, and
all unit and PostgreSQL integration tests pass.
