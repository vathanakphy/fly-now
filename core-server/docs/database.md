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
| `application_runtime_configs` | One runtime configuration per application |
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

SQL files in `internal/database/migrations` are embedded into the binary.
Migration execution:

1. obtains a dedicated database connection;
2. takes a PostgreSQL advisory lock;
3. checks `schema_migrations`;
4. runs each unapplied file in its own transaction;
5. records the version only when the SQL succeeds.

Applied migrations must never be edited. Schema changes require a new numbered
migration.

## Remaining work

- Add database constraints for valid lifecycle, runtime, environment target,
  service port, and deployment status values.
- Decide and enforce the slug format at the database boundary.
- Add migration and repository integration tests against PostgreSQL.
- Test transaction rollback when one aggregate insert fails.

