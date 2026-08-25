# FlyNow Core Documentation

These documents explain the current codebase. They describe implemented behavior
separately from planned behavior.

## Quick start

Read these first:

1. [Architecture](architecture.md) — components and dependency direction.
2. [Domain model](domain-model.md) — the data and business concepts.
3. [Request flows](request-flows.md) — how operations move through the system.
4. [Project progress](project-progress.md) — what is complete and what comes next.

## Detailed topics

- [Service layer](service-layer.md)
- [Repository layer](repository-layer.md)
- [Database](database.md)
- [Security](security.md)
- [Code patterns](code-patterns.md)

## Current scope

The running server currently provides `GET /health`. Database migrations are a
separate explicit command. Dockerfile-only application domain, service,
repository, and encryption code exists, but it is not connected to an
executable interface. The CLI is the next public interface planned in the root
[README](../README.md).
