# Learn FlyNow Core

This guide explains what the project currently implements, why the code is
organized this way, and what is still missing.

## 1. The project in one picture

FlyNow is becoming a platform that accepts an application's source code and a
Dockerfile configuration. Later, it will build an image and manage the resulting
container.

```text
User configuration
  |-- source URL and optional source reference
  |-- root directory
  |-- Dockerfile path
  |-- service port
  `-- optional health-check path
             |
             v
      application.Service
      validates business rules
             |
             v
        Store interface
             |
             v
       GORM repository
             |
             v
         PostgreSQL
```

Important: FlyNow does not build or run user application containers yet. The
current code stores and validates the configuration needed for that future
deployment flow.

## 2. Current executable behavior

The only executable is `cmd/server`.

When it starts, it:

1. loads environment configuration;
2. creates a structured JSON logger;
3. connects to PostgreSQL;
4. starts an HTTP server;
5. exposes `GET /health`;
6. shuts down safely after SIGINT or SIGTERM.

The server deliberately does not apply database migrations. Schema changes use
the separate one-off `cmd/migrate` executable.

The application service exists as Go code, but `cmd/server` does not construct
or expose it. The planned CLI will become its first user interface.

## 3. Why the design became Dockerfile-only

The earlier model supported several runtime values:

```text
auto, dockerfile, go, node, python, static
```

That design would require FlyNow to understand how to build every supported
language. The new design has one clear contract:

> Every deployable application provides a Dockerfile. FlyNow controls the image
> build and container lifecycle.

This does not mean users provide raw `docker build` or `docker run` commands.
FlyNow should generate those operations so it can control image names, labels,
networks, ports, limits, secrets, and cleanup.

## 4. Domain model

Domain types live in `internal/application`. They describe the business concepts
without GORM tags or CLI parsing details.

### Application aggregate

```go
type Application struct {
    ID             uuid.UUID
    Name           string
    Slug           string
    LifecycleState LifecycleState
    Source         Source
    Container      ContainerConfig
    Environment    []EnvironmentVariable
    // timestamps
}
```

An application is the aggregate root. Its source and container configuration
belong to it and are written together.

Why use an aggregate: an application without its source or container settings
would be incomplete. The repository therefore uses a transaction when it writes
these related records.

### ContainerConfig

```go
type ContainerConfig struct {
    RootDirectory   string
    DockerfilePath  string
    ServicePort     int
    HealthCheckPath *string
    AutoDeploy      bool
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

Field meanings:

- `RootDirectory`: build context inside the acquired source, such as `backend`.
- `DockerfilePath`: Dockerfile relative to the root, such as `Dockerfile` or
  `deploy/Dockerfile.prod`.
- `ServicePort`: port on which the application listens inside its container.
- `HealthCheckPath`: optional path such as `/health`.
- `AutoDeploy`: whether a future source change should trigger deployment.

The old runtime, build-command, and start-command fields were removed. The
Dockerfile should define its build steps and usually its `CMD` or `ENTRYPOINT`.

### Why `*string` is used

```go
HealthCheckPath *string
```

A pointer represents an optional value:

- `nil`: no health-check path was configured.
- non-nil: a path was configured.

A normal string cannot clearly distinguish “missing” from an intentionally
provided empty string.

## 5. Create and update inputs

Stored models and user inputs are intentionally different types.

```go
type CreateInput struct {
    Name           string
    SourceURL      string
    RootDirectory  string
    DockerfilePath string
    ServicePort    int
    // optional settings
}
```

Why: users should not control database-generated IDs, timestamps, encrypted
storage fields, or deletion metadata.

Updates use the generic `Change[T]` type:

```go
type Change[T any] struct {
    Value T
    Set   bool
}
```

Example:

```go
AutoDeploy: Change[bool]{Set: true, Value: false}
```

Why: `false` is both a valid value and Go's zero value. `Set` tells the service
whether the caller actually requested the change.

## 6. Application service

`application.Service` owns validation and application operations.

```go
type Service struct {
    store     Store
    encryptor Encryptor
}
```

It depends on interfaces rather than concrete GORM or AES types.

Why: service tests can use small fake implementations, and business logic does
not become coupled to PostgreSQL or one encryption library.

### Create flow

`Service.Create` performs these steps:

```text
CreateInput
  -> trim text
  -> create UUIDs
  -> generate slug
  -> apply defaults
  -> normalize paths
  -> validate complete application
  -> store.Create
```

Defaults are:

```text
root_directory = "."
dockerfile_path = "Dockerfile"
service_port = 8080
```

These defaults make a repository with a Dockerfile at its root easy to
configure.

### Path normalization

The service uses `path.Clean`:

```go
path.Clean("deploy/../Dockerfile") // "Dockerfile"
```

Why: equivalent paths are stored consistently and validation operates on a
clear path.

It then rejects:

- absolute paths such as `/etc/passwd`;
- `..` paths that escape the allowed directory;
- an empty path;
- `.` as the Dockerfile path because that identifies a directory, not a file.

The service cannot check whether the Dockerfile exists yet. That requires first
cloning or extracting the source, so it belongs in the future source-acquisition
and deployment flow.

### Update flow

```text
identifier
  -> load existing application
  -> apply fields where Change.Set is true
  -> normalize paths
  -> validate the complete result
  -> store.Update
```

Why validate the complete result: two fields may be valid separately but form
an invalid application when combined.

### Error wrapping

```go
return fmt.Errorf("update application %q: %w", idOrSlug, err)
```

`%w` preserves the original error while adding operation context. Callers can
still use `errors.Is` or `errors.As` to recognize known errors.

## 7. Store interface and repository

The service defines the persistence behavior it needs:

```go
type Store interface {
    Create(context.Context, *Application) error
    ByID(context.Context, uuid.UUID) (Application, error)
    BySlug(context.Context, string) (Application, error)
    Update(context.Context, *Application) error
    // other operations
}
```

The GORM repository in `internal/application/store` implements this interface.

```go
var _ application.Store = (*GORM)(nil)
```

This is a compile-time assertion. Compilation fails if `GORM` stops satisfying
the interface.

### Why domain and database records are separate

The repository has private records such as `applicationRecord` and
`containerRecord`.

Why:

- GORM-specific tags remain inside the store package.
- `gorm.DeletedAt` does not leak into the domain.
- database column changes do not automatically redefine business concepts.
- another repository implementation could reuse the same service.

Mapping functions convert in both directions:

```text
Application -> applicationRecord -> PostgreSQL
PostgreSQL -> applicationRecord -> Application
```

### Transactional creation

Application creation inserts:

1. application;
2. source;
3. container configuration;
4. initial environment variables, if any.

All inserts run inside one GORM transaction. If one fails, PostgreSQL rolls back
all of them.

### Preloading

GORM `Preload` loads related records:

```go
Preload("Source").
Preload("Container").
Preload("Environment")
```

Without preloading, the returned application would contain only its main row
and would be missing its related configuration.

### Soft deletion

Applications use GORM's `DeletedAt`. Deleting sets a timestamp instead of
physically removing the row. Normal GORM queries then ignore that application.

Why: historical data remains available, while normal users see only active
applications.

### Corrected repository errors

The repository now returns:

- `ErrNotFound` when an application is missing;
- `ErrEnvironmentMissing` when an environment variable is missing;
- `ErrSlugConflict` when the active-slug constraint is violated.

Repository failures are wrapped with operation context unless they are known
domain errors that callers need to recognize directly.

## 8. Database migration

Migration execution follows a Django-style operational pattern:

```text
server command  -> run application only
migrate command -> apply pending schema versions, then exit
```

`cmd/migrate` loads configuration, connects to PostgreSQL, calls the migration
runner, and closes the connection. It can be cancelled with SIGINT or SIGTERM.

Why separate it from server startup:

- restarting an application should not unexpectedly change its schema;
- migrations can be reviewed and run as an explicit deployment step;
- migration failure can stop deployment before new application instances start;
- several server replicas do not all attempt schema deployment during startup.

The advisory lock remains useful because two operators or deployment jobs could
still invoke the migration command at the same time.

Migration `000003_docker_only_container_config.sql` changes the old database
design without editing migration `000002`.

It:

1. renames `application_runtime_configs` to
   `application_container_configs`;
2. adds `dockerfile_path`;
3. sets existing records to `Dockerfile`;
4. makes the new column required;
5. removes `runtime`, `build_command`, and `start_command`;
6. adds path, port, and health-check constraints.

Why not edit `000002`: a database may already have recorded migration 2 as
applied. Editing it would not update that database and would make fresh and
existing installations produce different schemas.

The safe pattern is always:

```text
old migration remains immutable
          +
new numbered migration describes the change
```

The migration runner applies each migration inside a transaction. If a
statement fails, the migration version is not recorded.

Run it locally without Docker:

```sh
go run ./cmd/migrate
```

## 9. Environment-variable security

The existing environment flow remains unchanged:

```text
plaintext
  -> application service
  -> Encryptor.Seal
  -> ciphertext + nonce + key version
  -> repository
  -> PostgreSQL
```

AES-GCM encryption lives in `internal/secret`. The application ID and variable
key are authenticated as additional data, binding ciphertext to its intended
context.

When variables are listed, the service removes ciphertext and nonce before
returning the result.

Still missing: startup encryption-key configuration and multi-key rotation.

## 10. Service tests

The service tests use `stubStore` and `stubEncryptor` instead of PostgreSQL.

They currently verify:

- name normalization and slug generation;
- default root, Dockerfile, and port values;
- invalid source, root, Dockerfile, and port rejection;
- intentional zero-value updates;
- Dockerfile path normalization;
- encryption before persistence;
- removal of encrypted material from list results.

Why unit tests use stubs: they run quickly and test business behavior directly.

Still needed: real-PostgreSQL repository and migration integration tests.

## 11. Production Docker setup

The original `Dockerfile` is production-style:

```text
Go builder image
  -> download modules
  -> compile one static binary
  -> copy binary into small Alpine image
  -> run as non-root user
```

Source code is copied during image build. Therefore a source change requires a
new image build. This is good for repeatable production images but slow during
development.

For first setup or after receiving a schema migration:

```sh
docker compose build
docker compose run --rm migrate
docker compose up -d flynow
```

For an ordinary restart, run only `docker compose up -d flynow`.

## 12. Standalone development Docker setup

Development uses three new files:

- `Dockerfile.dev`
- `docker-compose.dev.yml`
- `.air.toml`

Build it and apply pending migrations during initial setup or after a schema
change:

```sh
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml run --rm migrate
```

Then start the development server:

```sh
docker compose -f docker-compose.dev.yml up
```

This single Compose file starts both FlyNow and PostgreSQL.

### Dockerfile.dev

The development image contains:

- Go 1.25;
- Air `v1.66.1`;
- downloaded project modules.

Air is a development file watcher. It rebuilds and restarts the Go process when
a `.go` file changes.

The Air version is pinned instead of using `@latest`. Why: a future Air release
may require a newer Go version and unexpectedly break the development build.

### Bind mount

```yaml
volumes:
  - .:/app
```

This maps the host project into the container. Saving a host file immediately
changes the file visible at `/app`.

A bind mount alone is not enough for Go because the server is a compiled binary.
Air watches the mounted source, recompiles the binary, stops the old process,
and starts the new one.

### Cache volumes

```yaml
- flynow-go-mod-cache:/go/pkg/mod
- flynow-go-build-cache:/root/.cache/go-build
```

These caches avoid downloading and recompiling every dependency after each
container restart.

### Development PostgreSQL

The development Compose file contains its own PostgreSQL service, health check,
and volume:

```text
flynow-postgres-dev-data
```

`depends_on` waits for the PostgreSQL health check before starting FlyNow. The
FlyNow container connects to host `postgres`, which is the Compose service name.
Inside a container, `localhost` would refer to that same container, not the
PostgreSQL container.

The development database volume is separate from the production-style Compose
volume, reducing accidental mixing of development data.

### Air configuration

Air runs:

```sh
go build -o ./tmp/flynow ./cmd/server
```

It watches `.go` files, ignores generated `tmp`, vendor, and Git directories,
and sends an interrupt before stopping the old server. This allows the existing
graceful-shutdown code to run during reload.

The `tmp/` directory is ignored by Git and Docker build context because it holds
generated development binaries.

### Daily development commands

First setup or after changing `Dockerfile.dev`:

```sh
docker compose -f docker-compose.dev.yml build
```

After adding or pulling a schema migration:

```sh
docker compose -f docker-compose.dev.yml run --rm migrate
```

Start the development server:

```sh
docker compose -f docker-compose.dev.yml up
```

Normal Go code change:

```text
save the file -> Air rebuilds -> server restarts
```

After changing `go.mod` or `go.sum`:

```sh
docker compose -f docker-compose.dev.yml restart flynow
```

Stop containers but keep database data:

```sh
docker compose -f docker-compose.dev.yml down
```

Delete development database and cache volumes too:

```sh
docker compose -f docker-compose.dev.yml down -v
```

Be careful: `down -v` permanently removes the development database stored in
that Compose project's volumes.

## 13. What has not been implemented

The following are still future work:

- application CLI commands;
- encryption key configuration at startup;
- source cloning and archive extraction;
- checking that the configured Dockerfile exists;
- Docker API integration;
- image building;
- container create/start/stop/remove operations;
- deployment state and RabbitMQ worker;
- routing, logs, monitoring, scaling, and recovery;
- PostgreSQL repository and migration integration tests.

Do not confuse stored Dockerfile configuration with deployment support. The
current service can remember what should eventually be deployed; it cannot yet
perform the deployment.

## 14. Recommended learning path

Read the code in this order:

1. `internal/application/application.go`
2. `internal/application/configuration.go`
3. `internal/application/input.go`
4. `internal/application/service.go`
5. `internal/application/service_test.go`
6. `internal/application/store/model.go`
7. `internal/application/store/gorm.go`
8. `internal/database/migrations/000003_docker_only_container_config.sql`
9. `cmd/migrate/main.go`
10. `cmd/server/main.go`
11. `Dockerfile.dev`, `.air.toml`, and `docker-compose.dev.yml`

For each file, ask:

```text
What responsibility does this file own?
What details does it intentionally avoid knowing?
Which interface connects it to the next layer?
What test proves its behavior?
```

Those questions explain the central design rule of this project: keep business
rules, persistence, process startup, and deployment infrastructure separate.
