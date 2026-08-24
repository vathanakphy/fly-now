# Project Progress

## Summary

The foundation is implemented and Stage 2 is in progress. The internal
application core is mostly present, but users cannot operate it until the CLI
and encryption configuration are connected.

## Stage assessment

| Area | Status | Evidence or gap |
|---|---|---|
| Project foundation | Complete in code | Config, logging, PostgreSQL, migrations, health, shutdown, Docker Compose, unit tests |
| Domain model | Complete for current scope | Pure types, separate inputs, lifecycle values |
| Database schema | Partial | Tables exist; required constraints and integration tests remain |
| PostgreSQL repository | Mostly complete | CRUD and transactions exist; error issues and integration tests remain |
| Application service | Mostly complete | Rules and operations exist; no executable wiring |
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

## README tracking corrections

The root README is broadly accurate. These checked repository claims are only
partially complete:

1. Application and environment deletion return swapped not-found error types.
2. Several persistence failures lack operation context.
3. Repository behavior is not protected by PostgreSQL integration tests.

## Recommended next order

1. Fix repository error mapping and error wrapping.
2. Add PostgreSQL migration and repository integration tests.
3. Add typed encryption key and key-version configuration.
4. Create `cmd/flynow` and wire repository, encryptor, and service.
5. Implement application and environment CLI commands.
6. Test parsing, exit codes, secret masking, persistence, and rollback.
7. Review database constraints in a new migration.

Stage 2 is complete only when the CLI can manage applications across process and
container restarts, secrets are encrypted at rest, invalid operations fail, and
all unit and PostgreSQL integration tests pass.

