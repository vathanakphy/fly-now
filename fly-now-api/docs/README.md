# Fly Now API documentation

This directory explains the current Spring Boot application as it exists in the repository. It is written for developers who are new to Spring Boot and to this codebase.

## Reading order

1. [Architecture](01-architecture.md) — packages, layers, dependency flow, and important Spring concepts.
2. [Running and configuration](02-running-and-configuration.md) — PostgreSQL, profiles, properties, Maven, debugging, Swagger, and SMTP.
3. [Authentication](03-authentication.md) — registration, login, JWT, refresh rotation, logout, password recovery, lockout, and CSRF.
4. [User module](04-user-module.md) — profiles, roles, statuses, and administrator operations.
5. [API reference](05-api-reference.md) — every current HTTP endpoint and example requests.
6. [Database and security decisions](06-database-and-security.md) — tables, token storage, cookies, transactions, and production limitations.
7. [Source code guide](07-source-code-guide.md) — the purpose of every current Java source file.
8. [Product and infrastructure PRD](08-product-and-infrastructure-prd.md) — product scope, React/Spring/Go boundaries, data stores, system flows, security, and delivery phases.
9. [Stage 1 database design](09-stage-1-database-design.md) — table relationships, ownership, source versioning, runtime configuration, secrets, readiness, and deletion decisions.
10. [Stage 1 PostgreSQL schema](sql/stage-1-schema.sql) — executable database definition derived from the Stage 1 task tracker.
11. [Ownership authorization](10-ownership-authorization.md) — reusable JWT-subject ownership checks and the required application-module integration pattern.

## Current scope

Implemented:

- Normal username/password registration and login
- RSA-signed JWT access tokens
- Rotating opaque refresh tokens
- Logout, logout-all, session listing, and session revocation
- Forgot, reset, and change password
- Login failure lockout
- User profile read/update
- User and administrator roles
- Administrator user status/role management
- Validation, consistent responses, Swagger, Actuator, CORS, and CSRF

Intentionally not implemented:

- MFA
- Passkeys/WebAuthn
- Email ownership verification
- Flyway migrations
- Rate limiting
- Automated tests
- Project/source/deployment features from later phases of the development plan

The application currently uses Hibernate schema synchronization (`ddl-auto=update`) for development. This is convenient during early development but is not the final production database strategy.
