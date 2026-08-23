# FlyNow Core — Phase 1

FlyNow Core is the backend of a self-hosted platform as a service. The current
implementation completes the Project Foundation stage: configuration,
structured logging, PostgreSQL migrations, an HTTP health check, and graceful
shutdown. The checklist below tracks the remaining Phase 1 backend work.

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
- [x] Add embedded, transactional database migrations.
- [x] Add an HTTP server and database-aware `GET /health` foundation endpoint.
- [x] Handle SIGINT/SIGTERM and graceful shutdown.
- [x] Containerize FlyNow and PostgreSQL with Docker Compose.
- [x] Add basic configuration and health-handler tests.

**Exit criteria:** `docker compose up -d --build` starts the current stack,
`/health` returns HTTP 200, `go test ./...` passes, and Compose can stop FlyNow
gracefully.

### 2. Application Management and CLI — current stage

#### 2.1 Domain model

- [x] Create focused application and configuration model files.
- [x] Define pure `Application`, `Source`, `RuntimeConfig`, and
      `EnvironmentVariable` domain types without GORM dependencies.
- [x] Define create and update input types separately from stored models.
- [x] Define lifecycle values in Go; add transition rules when runtime behavior
      is implemented.
- [x] Keep database and CLI details out of domain types.

#### 2.2 Database schema

- [x] Create the applications, sources, runtime configuration, environment
      variables, and deployments migration.
- [ ] Review required constraints for slug format, lifecycle state, runtime,
      environment target, service port, and deployment status.
- [x] Use soft deletion for applications.
- [ ] Add migration integration tests against PostgreSQL.
- [ ] Never edit an applied migration; add a new numbered migration instead.

#### 2.3 PostgreSQL repository

- [x] Isolate GORM records and queries in `internal/application/store`.
- [x] Insert an application, source, runtime configuration, and environment
      variables atomically.
- [x] Get an active application by ID or slug.
- [x] List active applications with deterministic ordering.
- [x] Update allowed fields without replacing unspecified or zero values.
- [x] Implement soft deletion through GORM's `DeletedAt` behavior.
- [x] Add, replace, list, and remove environment variables.
- [x] Map missing rows and duplicate slugs to application errors.
- [x] Wrap persistence errors with operation context.

#### 2.4 Application service

- [x] Create `internal/application/service.go` and `errors.go`.
- [x] Validate application names and generate normalized slugs.
- [x] Validate source URLs and normalize optional references.
- [x] Validate root directory, commands, port, and health-check path.
- [x] Treat `runtime=auto` and missing commands as detection requests.
- [x] Encrypt environment values before calling the store.
- [x] Never return ciphertext, nonces, or decrypted sensitive values from list
      operations.
- [x] Use database transactions for multi-table creation and updates.

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
- [ ] Test CLI argument parsing and exit codes.
- [x] Verify application service list results omit encrypted value material.
- [ ] Verify sensitive values never appear in future CLI output or logs.

**Exit criteria:** the CLI can create, list, inspect, update, and delete an
application; configuration persists across CLI runs and container restarts;
environment values are encrypted at rest; invalid operations are rejected; and
all unit and PostgreSQL integration tests pass.

### 3. Container Runtime

- [ ] Add `internal/runtime` only when implementation starts.
- [ ] Define the smallest interface required for Docker operations.
- [ ] Connect to Docker with explicit configuration and timeouts.
- [ ] Create, start, stop, restart, inspect, and remove containers.
- [ ] Add FlyNow labels to every managed Docker resource.
- [ ] Refuse to modify containers not owned by FlyNow.
- [ ] Create a dedicated network for managed applications.
- [ ] Persist the association between deployments and runtime instances.
- [ ] Test the complete lifecycle using disposable test containers.

**Exit criteria:** a service test can manage one labeled container through its
full lifecycle without changing unrelated Docker resources.

### 4. Deployment Service and RabbitMQ

#### 4.1 Durable deployment state

- [ ] Define allowed deployment statuses and transitions.
- [ ] Create an immutable snapshot of source, runtime, commands, and environment
      configuration for every deployment.
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
- [ ] Detect supported runtimes when configuration uses `auto`.
- [ ] Run user build commands only inside isolated build containers.
- [ ] Build an immutable image and record its digest/reference.
- [ ] Bound build time, output size, CPU, memory, and log volume.
- [ ] Clean temporary source and build resources after success or failure.

**Exit criteria:** representative Go, Node.js, and uploaded-source applications
produce repeatable images, while invalid or unsafe sources fail cleanly.

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
- [ ] Recreate containers safely when runtime configuration changes.

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

- [ ] Test Git and uploaded-source deployment paths.
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

```sh
docker compose up -d
```

FlyNow waits for PostgreSQL's health check before starting. Inside the Compose
network it connects to the database using the service name `postgres`; using
`localhost` there would incorrectly refer to the FlyNow container itself.
PostgreSQL is not published to the host; only FlyNow's HTTP port is exposed.

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
fast. Migrations are embedded in the binary and run transactionally under a
PostgreSQL advisory lock, making startup self-contained and safe when multiple
instances start.

Future `application`, `deployment`, `source`, `build`, `runtime`, `routing`,
`monitoring`, and `transport` packages can be added under `internal/` as real
features arrive. They can receive the pool, logger, and configuration through
explicit constructors without changing this lifecycle or introducing a
dependency-injection framework.
