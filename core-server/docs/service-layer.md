# Service Layer

## Summary

`internal/application.Service` implements application use cases. It validates
input, applies defaults, coordinates encryption, and calls the persistence
interface. It does not contain SQL or GORM types.

## Dependencies

```go
type Store interface {
    Create(context.Context, *Application) error
    ByID(context.Context, uuid.UUID) (Application, error)
    BySlug(context.Context, string) (Application, error)
    // update, delete, list, and environment operations
}

type Encryptor interface {
    Seal(plaintext, additionalData []byte) (
        ciphertext, nonce []byte,
        keyVersion int,
        err error,
    )
}
```

The service defines these interfaces because it is their consumer.

## Operations

| Method | Behavior |
|---|---|
| `Create` | Normalize input, generate IDs and slug, apply defaults, validate, persist |
| `Application` | Treat a valid UUID as an ID; otherwise query by slug |
| `Applications` | List active applications through the store |
| `Update` | Load, apply only explicitly set changes, validate, persist |
| `Delete` | Resolve ID or slug, then soft-delete through the store |
| `SetEnvironment` | Validate, encrypt, and upsert one variable |
| `DeleteEnvironment` | Validate the key and remove one variable |
| `Environment` | List metadata while removing ciphertext and nonce |

## Validation boundary

Validation happens before persistence so invalid domain input does not reach the
database. `ValidationError` identifies the invalid field and rule.

The database must still enforce essential constraints because data may be
written outside this service and concurrent requests can race.

## Transaction boundary

The service treats an application as one aggregate, but the repository owns the
actual database transaction. Create and update span multiple tables and must
succeed or fail together.

## Current limitation

No executable constructs this service. The future CLI composition root must
create the PostgreSQL repository and encryptor, then inject both into
`application.NewService`.

