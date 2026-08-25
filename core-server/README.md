# FlyNow Core — Phase 1

FlyNow Core is the backend of a self-hosted platform as a service. The current
implementation completes the Project Foundation stage: configuration,
structured logging, PostgreSQL migrations, an HTTP health check, and graceful
shutdown. The checklist below tracks the remaining Phase 1 backend work.

For a quick explanation of the current architecture, domain model, services,
database, security, and code patterns, see the [documentation index](docs/README.md).

## Learning track for this codebase

This project uses more architecture than the earlier calculator and todo
projects. Learn these topics in order to understand the current code without
getting lost.

### Tonight — essential topics

- [ ] **Struct methods and pointer receivers:** understand
      `func (s *Service) Create(...)` and when code uses `Application` versus
      `*Application`.
- [ ] **Interfaces:** understand how `application.Store` describes behavior and
      how `store.GORM` implements it without an `implements` keyword.
- [ ] **Manual dependency injection:** understand how constructors and `main.go`
      connect configuration, database, repository, service, and server objects.
- [ ] **`context.Context`:** understand cancellation, timeouts, and why context
      is the first argument passed from an entry point to database operations.
- [ ] **Go error handling:** practice `%w`, `errors.Is`, `errors.As`, sentinel
      errors, and custom error types.
- [ ] **Unit tests with stubs:** read `service_test.go` and understand how a fake
      store tests business rules without PostgreSQL.

### Next — backend topics

- [ ] **`net/http`:** handlers, `ServeMux`, request/response flow, JSON, status
      codes, and server timeouts.
- [ ] **Graceful shutdown:** OS signals, context cancellation, `defer`, and
      `http.Server.Shutdown`.
- [ ] **PostgreSQL and GORM:** connection pools, records, associations,
      `Preload`, transactions, constraints, and soft deletion.
- [ ] **Domain versus persistence models:** understand why
      `application.Application` is separate from private GORM records.
- [ ] **Generics for partial updates:** understand how `Change[T]` distinguishes
      an omitted field from an intentional zero value.
- [ ] **Explicit migrations:** understand immutable numbered SQL files,
      `schema_migrations`, transactions, and the separate `cmd/migrate` command.

### Practice path

Use the earlier todo application as a bridge:

1. Add methods to a `TaskService` struct.
2. Define a small `TaskStore` interface.
3. Make the JSON repository implement that interface.
4. Inject the repository into the service through a constructor.
5. Pass `context.Context` through service and repository operations.
6. Add service tests with an in-memory stub store.
7. Expose the service through `net/http` handlers.
8. Replace JSON persistence with PostgreSQL and a transaction.
9. Add graceful server shutdown.

Concurrency topics such as goroutines, channels, and mutexes can wait until the
deployment worker begins. The detailed current-code walkthrough is in
[learn.md](learn.md).

## Phase 1 — CLI-first development plan

**Target:** complete and validate the core platform before Year 4 starts. Work
through the stages in order and do not start a stage until the previous stage's
exit criteria pass.

### Architecture decision

The first public interface is a local CLI. REST and gRPC are deferred.

```text
flynow CLI command
        │
        ▼
application/deployment service
        │
        ▼
PostgreSQL repository
```

The CLI parses input and prints output only. Business rules live in services,
and SQL lives in repositories. This keeps the core reusable if REST or gRPC is
added later.

FlyNow supports Dockerfile-based applications only. Every application source
must contain a Dockerfile. The user selects the source, root directory,
Dockerfile path, service port, and optional health-check path; FlyNow owns the
generated `docker build` and container lifecycle operations. FlyNow never runs
user-supplied `docker build` or `docker run` shell commands.

```text
application source + container configuration
                    │
                    ▼
          verify selected Dockerfile
                    │
                    ▼
       FlyNow-controlled image build
                    │
                    ▼
       FlyNow-controlled container
```

Long-running work must not run inside the short-lived CLI process. When
deployments are introduced, a separate worker will consume RabbitMQ tasks:

```text
flynow deploy
    └── PostgreSQL transaction: deployment + outbox event
                                      │
                                      ▼
                              RabbitMQ publisher
                                      │
                                      ▼
                              flynow-worker process
```

### 1. Project Foundation — complete

- [x] Initialize the Go module and private `internal` packages.
- [x] Load typed configuration from environment variables and validate it.
- [x] Add structured logging with `log/slog`.
- [x] Create and verify a PostgreSQL connection pool.
- [x] Add embedded, transactional database migrations with an explicit
      `cmd/migrate` command.
- [x] Add an HTTP server and database-aware `GET /health` foundation endpoint.
- [x] Handle SIGINT/SIGTERM and graceful shutdown.
- [x] Containerize FlyNow and PostgreSQL with Docker Compose.
- [x] Add basic configuration and health-handler tests.

**Exit criteria:** the explicit migration command succeeds, `docker compose up
-d --build` starts the current stack, `/health` returns HTTP 200, `go test ./...`
passes, and Compose can stop FlyNow gracefully.

### 2. Application Management and CLI — current stage

#### 2.1 Domain model

- [x] Create focused application and configuration model files.
- [x] Define pure `Application`, `Source`, `ContainerConfig`, and
      `EnvironmentVariable` domain types without GORM dependencies.
- [x] Define create and update input types separately from stored models.
- [x] Define lifecycle values in Go; add transition rules when runtime behavior
      is implemented.
- [x] Keep database and CLI details out of domain types.
- [x] Replace `RuntimeConfig` with Docker-specific `ContainerConfig`.
- [x] Define `root_directory`, `dockerfile_path`, `service_port`, optional
      `health_check_path`, and `auto_deploy` as the complete container config.
- [x] Remove runtime detection, language runtime values, build commands, and
      start commands from domain and input types.
- [x] Default `root_directory` to `.`, `dockerfile_path` to `Dockerfile`, and
      `service_port` to `8080`.

#### 2.2 Database schema

- [x] Create the applications, sources, runtime configuration, environment
      variables, and deployments migration.
- [ ] Review required constraints for slug format, lifecycle state, container,
      environment target, service port, and deployment status.
- [x] Use soft deletion for applications.
- [x] Add a new numbered migration for Docker-only container configuration;
      never rewrite the existing `000002` migration.
- [x] Add `dockerfile_path` and remove obsolete runtime, build-command, and
      start-command columns.
- [ ] Add constraints for safe container configuration and supported status
      values.
- [ ] Add migration integration tests against PostgreSQL.
- [ ] Never edit an applied migration; add a new numbered migration instead.

#### 2.3 PostgreSQL repository

- [x] Isolate GORM records and queries in `internal/application/store`.
- [x] Insert an application, source, container configuration, and environment
      variables atomically.
- [x] Get an active application by ID or slug.
- [x] List active applications with deterministic ordering.
- [x] Update allowed fields without replacing unspecified or zero values.
- [x] Implement soft deletion through GORM's `DeletedAt` behavior.
- [x] Add, replace, list, and remove environment variables.
- [x] Map missing rows and duplicate slugs to application errors.
- [x] Wrap persistence errors with operation context.
- [x] Replace runtime record mappings with Docker container configuration
      mappings.
- [x] Fix application/environment not-found error mapping and consistently wrap
      repository errors with operation context.

#### 2.4 Application service

- [x] Create `internal/application/service.go` and `errors.go`.
- [x] Validate application names and generate normalized slugs.
- [x] Validate source URLs and normalize optional references.
- [x] Validate root directory, Dockerfile path, port, and health-check path.
- [x] Encrypt environment values before calling the store.
- [x] Never return ciphertext, nonces, or decrypted sensitive values from list
      operations.
- [x] Use database transactions for multi-table creation and updates.
- [x] Replace command/runtime validation with Dockerfile-only configuration
      validation.
- [x] Validate that root and Dockerfile paths are relative, clean, and cannot
      escape the checked-out source directory.
- [ ] Check that the selected Dockerfile exists only after source acquisition.

#### 2.5 Environment encryption

- [ ] Add an encryption key and key version to typed configuration.
- [ ] Validate key length during startup.
- [x] Implement authenticated AES-GCM encryption with a unique nonce per value.
- [x] Store ciphertext, nonce, and key version in PostgreSQL.
- [ ] Support key versioning so encryption can be rotated later.
- [x] Add encryption round-trip, invalid-key, invalid-nonce, and
      modified-ciphertext tests.
- [ ] Add encryption configuration and key-rotation integration tests.

#### 2.6 CLI

- [ ] Add `cmd/flynow/main.go` as the CLI composition root.
- [ ] Parse commands without placing business logic in `main.go`.
- [ ] Implement `flynow app create`.
- [ ] Implement `flynow app list`.
- [ ] Implement `flynow app get <id-or-slug>`.
- [ ] Implement `flynow app update <id-or-slug>`.
- [ ] Implement `flynow app delete <id-or-slug>`.
- [ ] Accept source, root directory, Dockerfile path, service port, and optional
      health-check path in application create/update commands.
- [ ] Do not accept raw `docker build` or `docker run` commands from users.
- [ ] Implement `flynow env set <app> KEY=VALUE`.
- [ ] Implement `flynow env unset <app> KEY`.
- [ ] Implement `flynow env list <app>` with sensitive values masked.
- [ ] Return non-zero exit codes for invalid input and failed operations.
- [ ] Make text output readable and reserve JSON output as a future option.

#### 2.7 Tests

- [x] Unit-test application validation and slug generation.
- [x] Unit-test the service with a small store test double.
- [ ] Integration-test repository operations against real PostgreSQL.
- [ ] Test duplicate slug, missing application, and deleted application cases.
- [ ] Test that a failed multi-table insert leaves no partial application.
- [x] Test default/custom Dockerfile paths and rejected path traversal.
- [ ] Test CLI argument parsing and exit codes.
- [x] Verify application service list results omit encrypted value material.
- [ ] Verify sensitive values never appear in future CLI output or logs.

**Exit criteria:** the CLI can create, list, inspect, update, and delete an
application; its Dockerfile configuration persists across CLI runs and
container restarts; environment values are encrypted at rest; invalid
operations are rejected; and all unit and PostgreSQL integration tests pass.

### 3. Container Runtime

- [ ] Add `internal/runtime` only when implementation starts.
- [ ] Define the smallest interface required for Docker operations.
- [ ] Connect to Docker with explicit configuration and timeouts.
- [ ] Build images only through FlyNow-controlled Docker API calls.
- [ ] Create, start, stop, restart, inspect, and remove containers.
- [ ] Add FlyNow labels to every managed Docker resource.
- [ ] Refuse to modify containers not owned by FlyNow.
- [ ] Create a dedicated network for managed applications.
- [ ] Persist the association between deployments and runtime instances.
- [ ] Apply explicit CPU, memory, timeout, and output limits to builds and
      containers.
- [ ] Test the complete lifecycle using disposable test containers.

**Exit criteria:** a service test can manage one labeled container through its
full lifecycle without changing unrelated Docker resources.

### 4. Deployment Service and RabbitMQ

#### 4.1 Durable deployment state

- [ ] Define allowed deployment statuses and transitions.
- [ ] Create an immutable snapshot of source, Dockerfile container
      configuration, and environment configuration for every deployment.
- [ ] Record trigger type, source revision, image reference, timestamps, attempts,
      and sanitized failure information.
- [ ] Prevent conflicting active deployments for one application.

#### 4.2 Transactional outbox

- [ ] Add an `outbox_events` migration.
- [ ] Create the deployment and outbox event in one PostgreSQL transaction.
- [ ] Publish only the event type, deployment ID, and event ID to RabbitMQ.
- [ ] Mark an outbox event published only after publisher confirmation.
- [ ] Retry unpublished events safely after process failure.

#### 4.3 RabbitMQ topology

- [ ] Add RabbitMQ to Docker Compose with persistent storage and a health check.
- [ ] Add typed RabbitMQ configuration and startup validation.
- [ ] Declare a durable deployment exchange and queue.
- [ ] Declare retry and dead-letter queues.
- [ ] Use persistent messages, publisher confirms, manual acknowledgements, and
      a bounded consumer prefetch.

#### 4.4 Worker

- [ ] Add `cmd/worker/main.go` as a long-running process.
- [ ] Load the deployment snapshot from PostgreSQL by deployment ID.
- [ ] Acknowledge a message only after durable status is stored.
- [ ] Make every deployment step idempotent because delivery is at least once.
- [ ] Retry temporary failures with bounded backoff.
- [ ] Move permanent failures to the dead-letter queue.
- [ ] Handle SIGINT/SIGTERM and finish or safely release in-progress messages.

#### 4.5 CLI deployment commands

- [ ] Implement `flynow deploy <app>` to enqueue a deployment.
- [ ] Implement `flynow deployment list <app>`.
- [ ] Implement `flynow deployment get <deployment-id>`.
- [ ] Display queued, building, deploying, succeeded, and failed states.

**Exit criteria:** a deployment request survives CLI, FlyNow, worker, RabbitMQ,
and PostgreSQL restarts; duplicate delivery does not create duplicate resources;
and exhausted failures are visible in PostgreSQL and the dead-letter queue.

### 5. Source Acquisition and Build

- [ ] Detect whether `source_url` represents Git or an uploaded artifact.
- [ ] Resolve a Git branch or tag to an exact commit SHA.
- [ ] Verify uploaded artifacts using their stored checksum.
- [ ] Prevent path traversal when extracting archives.
- [ ] Resolve the configured root directory without allowing path traversal.
- [ ] Resolve the Dockerfile path relative to the configured root directory.
- [ ] Reject deployment when the selected Dockerfile is missing or inaccessible.
- [ ] Generate image names, tags, and build options inside FlyNow.
- [ ] Never execute user-provided `docker build` or `docker run` shell commands.
- [ ] Build an immutable image and record its digest/reference.
- [ ] Bound build time, output size, CPU, memory, and log volume.
- [ ] Clean temporary source and build resources after success or failure.

**Exit criteria:** representative Git and uploaded sources containing valid
Dockerfiles produce repeatable images; missing Dockerfiles, invalid paths, and
unsafe sources fail cleanly; and no application process runs directly on the
FlyNow host.

### 6. Networking and Routing

- [ ] Attach application containers to the managed network.
- [ ] Integrate the selected reverse proxy.
- [ ] Generate a stable platform hostname for each application.
- [ ] Add, update, and remove routes as deployments change.
- [ ] Route traffic only to healthy instances.
- [ ] Test hostname isolation and unavailable backends.

**Exit criteria:** two applications are reachable through different hostnames
and cannot accidentally receive each other's traffic.

### 7. Logs and Monitoring

- [ ] Implement `flynow logs <app>` with bounded recent output.
- [ ] Track container and deployment status.
- [ ] Collect basic CPU and memory usage.
- [ ] Run application health checks with configurable timeouts.
- [ ] Bound log and monitoring retention.
- [ ] Avoid exposing environment secrets in collected logs and status output.

**Exit criteria:** an operator can determine application health and retrieve
enough recent logs and metrics to diagnose a failure.

### 8. Lifecycle, Recovery, and Resources

- [ ] Reconcile PostgreSQL desired state with Docker state after worker restart.
- [ ] Detect unexpected exits and unhealthy containers.
- [ ] Restart recoverable applications with bounded retries and backoff.
- [ ] Record terminal failures instead of creating infinite restart loops.
- [ ] Apply CPU and memory limits to every application container.
- [ ] Inject decrypted environment values only into the intended build/runtime.
- [ ] Recreate containers safely when container configuration changes.

**Exit criteria:** FlyNow recovers expected failures, reports unrecoverable ones,
enforces resource limits, and does not leak sensitive configuration.

### 9. Scaling and Sleep Mode

- [ ] Store and reconcile a desired instance count.
- [ ] Scale instances up and down idempotently.
- [ ] Load-balance only across healthy instances.
- [ ] Define inactivity and eligibility rules for sleep mode.
- [ ] Stop idle applications and wake them on demand.
- [ ] Test concurrent scaling, partial failure, sleep, and wake behavior.

**Exit criteria:** actual instances converge to desired state and eligible
applications sleep and wake without losing durable state.

### 10. Core Validation

- [ ] Test Git and uploaded-source Dockerfile deployment paths.
- [ ] Test create, deploy, route, observe, restart, scale, sleep, and delete.
- [ ] Test PostgreSQL, RabbitMQ, worker, Docker, and FlyNow restart recovery.
- [ ] Test failed builds, invalid sources, unhealthy apps, and unavailable
      dependencies.
- [ ] Verify cleanup leaves no orphaned containers, networks, images, or routes.
- [ ] Run all tests from a clean machine and empty Docker environment.
- [ ] Document limitations, backup requirements, and recovery procedures.
- [ ] Defer REST, gRPC, and UI work until the CLI core is reliable.

**Exit criteria:** the complete CLI deployment lifecycle passes repeatedly from
a clean environment, recovery tests pass, and no critical reliability issue
remains.

## Run locally

Requirement: Docker with Compose. Compose builds and runs FlyNow and PostgreSQL.

### Development with automatic reload

Build the development image and apply pending migrations when setting up the
database or after a schema change:

```sh
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml run --rm migrate
```

Then start development mode:

```sh
docker compose -f docker-compose.dev.yml up
```

The standalone development stack starts FlyNow and PostgreSQL. FlyNow
bind-mounts the project and uses Air to rebuild and restart only the Go process
when a `.go` file changes. The development image must be rebuilt only when
`Dockerfile.dev` or its installed tools change. Go module downloads, build
output, and development database data are kept in named Docker volumes.

Normal server restarts do not run migrations. Run the one-off `migrate` service
again only after pulling or creating a new schema migration.

After changing `go.mod` or `go.sum`, restart the service so the running process
loads the new module configuration:

```sh
docker compose -f docker-compose.dev.yml restart flynow
```

Stop the development stack with:

```sh
docker compose -f docker-compose.dev.yml down
```

### Production-style local stack

```sh
docker compose build
docker compose run --rm migrate
docker compose up -d flynow
```

FlyNow waits for PostgreSQL's health check before starting. Inside the Compose
network it connects to the database using the service name `postgres`; using
`localhost` there would incorrectly refer to the FlyNow container itself.
The local Compose configuration publishes PostgreSQL on
`${DATABASE_PORT:-5432}` and FlyNow on `${FLYNOW_PORT:-8080}`.

Later server restarts use `docker compose up -d flynow` without running
migrations. Run `docker compose run --rm migrate` explicitly after a schema
change.

The documented development values are defaults, so copying `.env.example` to
`.env` is optional. Compose reads `.env` automatically when overriding values.

```sh
curl http://localhost:8080/health
```

Healthy response:

```json
{"status":"healthy","database":"healthy"}
```

Stop the stack with `docker compose down`. Compose sends SIGTERM, so FlyNow
stops accepting requests, allows active requests up to the shutdown deadline,
and then closes the database pool.

## Commands

```sh
docker compose logs -f flynow
docker compose down
```

Use `docker compose down -v` only when you also want to delete local database
data.

## Structure and decisions

```text
cmd/server/main.go          dependency wiring and process lifecycle
cmd/migrate/main.go         explicit one-off database migration command
internal/config             typed environment configuration and validation
internal/database           GORM, PostgreSQL pool, and startup connectivity
internal/application        domain models, service, validation, and store contract
internal/application/store  private GORM records and PostgreSQL queries
internal/secret             authenticated environment-value encryption
internal/server             HTTP transport, health check, and graceful shutdown
internal/database/migrations ordered, embedded SQL migrations
Dockerfile                  production-style multi-stage FlyNow image
docker-compose.yml          FlyNow and PostgreSQL local stack
```

`main.go` owns construction order and cleanup but no business logic. The
database package owns GORM and its underlying `database/sql` connection pool.
Only repositories depend on GORM; services and transports will depend on
application behavior instead. GORM `AutoMigrate` is intentionally not used:
versioned SQL migrations remain the schema authority. The server depends on the
smallest capability needed by health checks (`Ping`), which keeps handler tests
fast. The server never applies migrations during startup. `cmd/migrate` embeds
and runs them transactionally under a PostgreSQL advisory lock as an explicit
operator or deployment action.

Future `application`, `deployment`, `source`, `build`, `runtime`, `routing`,
`monitoring`, and `transport` packages can be added under `internal/` as real
features arrive. They can receive the pool, logger, and configuration through
explicit constructors without changing this lifecycle or introducing a
dependency-injection framework.
