# Database

## Summary

FlyNow uses PostgreSQL. GORM handles application queries, while `database/sql`
is used for migrations and health checks.

## Tables

| Table | Purpose |
|---|---|
| `schema_migrations` | Applied migration versions |
| `applications` | Aggregate identity, name, slug, lifecycle, soft deletion |
| `application_sources` | One source per application |
| `application_container_configs` | One Dockerfile container configuration per application |
| `application_environment_variables` | Encrypted variables, unique by application and key |
| `deployments` | Future deployment attempts and status |

Child records reference `applications` with `ON DELETE CASCADE`. Normal
application deletion is soft, so cascading physical deletion does not occur in
that path.

## Important indexes

- Active application slugs have a partial unique index where `deleted_at` is
  null. A slug may be reused after soft deletion.
- Environment variables are indexed by application ID.
- Deployments are indexed by application, application plus creation time, and
  status.

## Migration process

SQL files in `internal/database/migrations` are embedded into the dedicated
`cmd/migrate` binary. `cmd/server` never runs them. Migration execution:

1. obtains a dedicated database connection;
2. takes a PostgreSQL advisory lock;
3. checks `schema_migrations`;
4. runs each unapplied file in its own transaction;
5. records the version only when the SQL succeeds.

Applied migrations must never be edited. Schema changes require a new numbered
migration.

Run pending migrations explicitly:

```sh
go run ./cmd/migrate
```

With the standalone development stack:

```sh
docker compose -f docker-compose.dev.yml run --rm migrate
```

With the production-style Compose stack:

```sh
docker compose run --rm migrate
```

Run this during initial database setup and after adding or receiving a new
schema migration, not on every server restart. The command is idempotent: it
checks `schema_migrations` and applies only pending versions.

## Remaining work

- Add database constraints for valid lifecycle, environment target, and
  deployment status values. Container paths and service ports are constrained.
- Decide and enforce the slug format at the database boundary.
- Add migration and repository integration tests against PostgreSQL.
- Test transaction rollback when one aggregate insert fails.
