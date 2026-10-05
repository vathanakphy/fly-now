# Stage 1 database design and relationships

This document explains the PostgreSQL schema required by the Google Sheet
`Stage 1 Tracker`. Stage 1 ends when an application reaches
`READY_TO_DEPLOY`; it does not build or run a container.

The complete PostgreSQL definition is available in
[sql/stage-1-schema.sql](sql/stage-1-schema.sql).

## 1. Relationship overview

```text
User
├── Auth sessions
├── Auth tokens
└── Applications
    ├── Source configuration
    │   ├── Source versions
    │   └── GitHub webhook deliveries
    ├── Runtime configuration
    └── Environment variables
```

The schema contains nine tables:

| Parent | Child | Cardinality | Foreign key |
|---|---|---:|---|
| `users` | `auth_sessions` | One-to-many | `auth_sessions.user_id` |
| `users` | `auth_tokens` | One-to-many | `auth_tokens.user_id` |
| `users` | `applications` | One-to-many | `applications.owner_id` |
| `applications` | `application_sources` | One-to-one | `application_sources.application_id` |
| `application_sources` | `source_versions` | One-to-many | `source_versions.source_id` |
| `application_sources` | `github_webhook_deliveries` | One-to-many | `github_webhook_deliveries.source_id` |
| `applications` | `application_runtime_configs` | One-to-one | `application_runtime_configs.application_id` |
| `applications` | `application_environment_variables` | One-to-many | `application_environment_variables.application_id` |

## 2. Identity and authentication

### `users`

`users` is the root table for identity. It stores the account name, unique
username and email, encoded password, role, account status, lockout state, JWT
token version, and login timestamps.

One user can own many applications and have many authentication records.

### `auth_sessions`

Each login creates a refresh session, so the relationship is:

```text
users 1 ──── * auth_sessions
```

Only a SHA-256 refresh-token hash is stored. The family ID connects rotated
tokens so reuse detection can revoke the entire token family. Deleting a user
deletes their sessions through `ON DELETE CASCADE`.

### `auth_tokens`

This table stores single-use action tokens. Stage 1 currently uses the
`PASSWORD_RESET` type. A user can have multiple historical tokens, but the
service invalidates older active tokens when it issues a replacement.

Only the hash is stored; the raw token is sent to the user and cannot be
reconstructed from the database.

## 3. Application ownership

```text
users 1 ──── * applications
```

`applications.owner_id` identifies the user who owns the application. Every
application read or mutation must constrain by both the application ID and the
authenticated user ID:

```sql
SELECT *
FROM applications
WHERE id = :application_id
  AND owner_id = :authenticated_user_id
  AND deleted_at IS NULL;
```

This is the database foundation for the sheet's ownership rule. Checking only
the application ID would allow one user to access another user's application.

Application slugs are unique per active owner. A partial unique index ignores
soft-deleted applications, allowing a user to reuse an old slug.

The stored lifecycle is:

```text
DRAFT → CONFIGURING → READY_TO_DEPLOY
```

## 4. Source configuration

```text
applications 1 ──── 1 application_sources
```

An application has one active source configuration. `source_type` determines
which input is configured:

- `ZIP`: source arrives through multipart upload.
- `GITHUB`: source is cloned from a repository and branch.

The one-to-one relationship is enforced by a unique constraint on
`application_sources.application_id`.

For GitHub, the table stores the repository URL, normalized repository name,
branch, and encrypted webhook secret. A webhook secret must be encrypted rather
than hashed because FlyNow needs the original value to calculate and compare the
GitHub HMAC signature.

## 5. Source versions and inspection

```text
application_sources 1 ──── * source_versions
```

Every upload or repository synchronization creates a new immutable version:

```text
Source
├── Version 1: ZIP_UPLOAD
├── Version 2: GITHUB_CLONE
└── Version 3: GITHUB_PUSH
```

A partial unique index guarantees that at most one version per source has
`is_current = true`.

A source version stores:

- source origin and processing status;
- generated storage key;
- original filename and media type when applicable;
- size and SHA-256 checksum;
- Git commit SHA when applicable;
- bounded file-tree inspection result as JSON;
- detected project type and Dockerfile path;
- safe failure information.

PostgreSQL stores metadata only. The actual ZIP, repository snapshot, and
extracted files belong in local storage during development and S3/MinIO in a
deployed environment.

Replacing source creates a new version rather than overwriting history. The
service changes `is_current` within one transaction.

## 6. GitHub webhook deliveries

```text
application_sources 1 ──── * github_webhook_deliveries
```

The unique GitHub `delivery_id` provides idempotency. If GitHub retries the same
request, FlyNow recognizes it instead of creating the same source version twice.

The table records event type, repository, branch, commit, processing status,
and limited diagnostic information. It deliberately does not retain the full
webhook payload.

The source reference uses `ON DELETE SET NULL`, preserving the processing history
after a source configuration is removed.

## 7. Desired runtime configuration

```text
applications 1 ──── 1 application_runtime_configs
```

This table stores the desired container configuration:

- internal application port;
- build-context and Dockerfile paths;
- optional start command from the Stage 1 sheet;
- CPU and memory limits;
- health-check path and interval;
- restart policy and instance count.

Stage 1 validates and stores this configuration but never executes it. The Go
worker and Docker runtime begin in Stage 2.

The preferred architecture is Dockerfile-controlled execution. If
`start_command` remains in the product, Stage 2 must treat it as structured,
validated configuration and must never concatenate it into a shell command.

## 8. Environment variables and secrets

```text
applications 1 ──── * application_environment_variables
```

The combination of `application_id` and `name` is unique, so one application
cannot contain two variables with the same name.

Variable names must match:

```text
^[A-Za-z_][A-Za-z0-9_]*$
```

All values are encrypted before persistence. Each row stores ciphertext, a
unique AES-GCM nonce, and a key version. `is_secret` controls masking in API
responses; it does not decide whether the database value is encrypted.

The API must never return ciphertext, nonce, encryption key, or plaintext for a
secret variable.

## 9. Readiness has no separate table

Readiness is derived from the current database state:

```text
Current source version exists and is INSPECTED
                     +
Dockerfile path was detected and is valid
                     +
Runtime configuration is valid
                     +
Required environment configuration is present
                     ↓
              READY_TO_DEPLOY
```

The readiness service returns an issue list to React. When no issue remains, it
updates `applications.lifecycle_state` to `READY_TO_DEPLOY`.

Persisting a separate readiness row would duplicate derived state and could
become inconsistent with the source or configuration tables.

## 10. Delete behavior

| Parent deletion | Child behavior | Reason |
|---|---|---|
| User | Sessions and action tokens cascade | Credentials must not survive the account. |
| User | Owned applications are restricted | Applications require an explicit cleanup/transfer decision. |
| Application hard delete | Source, runtime configuration, and environment variables cascade | They cannot exist without an application. |
| Source hard delete | Source-version metadata cascades | Versions belong only to that source. |
| Source hard delete | Webhook source reference becomes null | Delivery processing history should remain. |

Normal application removal is a soft delete through `applications.deleted_at`.
Physical source objects must be removed by a storage cleanup operation because
PostgreSQL foreign keys cannot delete filesystem or object-storage content.

## 11. Stage boundary

These tables support:

```text
Register → Login → Create application → Add source → Inspect source
→ Configure runtime and environment → READY_TO_DEPLOY
```

They do not support actual execution. Stage 2 will introduce deployment and
runtime records such as `deployments`, `deployment_events`, `outbox_events`,
`runtime_instances`, and `application_routes`, together with RabbitMQ, the Go
worker, Docker, and Traefik.
