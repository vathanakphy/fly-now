# Code Patterns

## Summary

The code uses small architectural patterns to keep business logic testable and
independent from infrastructure.

## Service layer

Business operations live in `application.Service`, not in `main`, a CLI parser,
or database code.

Why: all public interfaces should enforce the same rules.

Common mistake: putting validation directly in CLI commands, which allows a
future HTTP interface to behave differently.

## Repository pattern

The `Store` interface describes persistence behavior needed by the service.
`store.GORM` supplies the PostgreSQL implementation.

Why: service tests can use a small test double without starting PostgreSQL.

Common mistake: designing a large generic repository instead of defining only
operations required by the use case.

## Dependency inversion

The application package owns the `Store` and `Encryptor` interfaces.
Infrastructure packages implement them.

Why: the stable business layer does not depend on GORM or encryption details.

## Aggregate and transaction

Application, source, container configuration, and initial environment records
form one aggregate. The repository writes them in one transaction.

Why: callers should never observe a partially created application.

## Explicit optional updates

```go
AutoDeploy: Change[bool]{Set: true, Value: false}
```

Why: a plain `bool` cannot distinguish “not provided” from “set to false.”

## Domain-to-record mapping

The store maps domain objects to private GORM records.

Why: persistence annotations and types remain replaceable and do not define the
domain.

## Composition root

`cmd/server/main.go` constructs configuration, logging, PostgreSQL, and the HTTP
server. `cmd/migrate/main.go` separately constructs only what the one-off
migration operation needs. The future `cmd/flynow/main.go` should similarly wire
the repository, encryptor, service, and CLI parser.

Why: object construction stays at the program boundary while packages receive
ready-to-use dependencies.

Keeping migration composition separate also prevents ordinary server restarts
from unexpectedly changing the schema.

## Soft deletion

Applications use a deletion timestamp. Normal GORM queries exclude deleted rows.

Why: application history can remain available while the active slug becomes
reusable.
