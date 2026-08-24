# Repository Layer

## Summary

`internal/application/store.GORM` implements the service-owned `Store`
interface. Database records and mapping code stay inside this package.

## Record mapping

GORM records mirror database columns and associations. Mapping functions convert
between those records and pure `internal/application` types. This prevents GORM
tags and `gorm.DeletedAt` from leaking into the domain model.

## Query behavior

- Create inserts the application, source, runtime, and environment rows in one
  transaction.
- Get preloads source, runtime, and environment records.
- List orders applications by `created_at`, then `id`.
- Update changes application, source, and runtime rows in one transaction.
- Delete uses GORM soft deletion.
- Environment set uses PostgreSQL upsert on `(application_id, key)`.
- Environment lists are ordered by key.

GORM automatically excludes rows with a valid `deleted_at` value from normal
application queries.

## Error mapping

The repository maps a missing application query to `application.ErrNotFound`.
It maps the named active-slug unique constraint to
`application.ErrSlugConflict` during creation.

## Known issues

1. `GORM.Delete` currently returns `ErrEnvironmentMissing` when the application
   is absent. It should return `ErrNotFound`.
2. `GORM.DeleteEnvironment` returns `ErrNotFound` for a missing variable instead
   of the more specific `ErrEnvironmentMissing`.
3. Some create and update failures are returned without operation context.
4. Repository behavior has no real-PostgreSQL integration tests.

These issues mean the README repository checklist is mostly, not fully,
complete.

