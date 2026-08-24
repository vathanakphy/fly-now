# Request Flows

## Application creation

```text
future CLI
  -> Service.Create
  -> trim input and generate IDs/slug
  -> apply defaults
  -> validate aggregate
  -> Store.Create
  -> PostgreSQL transaction
       applications
       application_sources
       application_runtime_configs
       optional environment rows
```

If any insert fails, the transaction rolls back.

## Application lookup

```text
input identifier
  -> parse as UUID
       | success -> Store.ByID
       ` failure -> Store.BySlug
  -> preload source, runtime, and environment
```

Normal lookups do not include soft-deleted applications.

## Partial update

```text
identifier + UpdateInput
  -> load existing application
  -> apply only Change fields where Set=true
  -> validate complete result
  -> transactional repository update
```

Validation uses the resulting complete aggregate, not only changed fields.

## Environment-variable set

```text
identifier + KEY=VALUE
  -> load application
  -> validate key and target
  -> encrypt using application ID and key as context
  -> upsert encrypted record
```

Setting an existing key replaces its encrypted value and metadata.

## Environment-variable list

```text
identifier
  -> load application
  -> repository list ordered by key
  -> clear ciphertext and nonce
  -> return safe metadata
```

## Health check

```text
GET /health
  -> two-second PostgreSQL ping
       | success -> 200 {healthy}
       ` failure -> 503 {unhealthy}
```

