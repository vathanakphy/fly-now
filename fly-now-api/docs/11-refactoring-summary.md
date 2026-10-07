# API refactoring summary

## Purpose

This refactoring improves separation of concerns, response consistency,
configuration safety, and maintainability without changing the existing
`auth`, `user`, `entities`, and `shared` module design.

Existing endpoint URLs and successful response structures remain compatible.
The error response structure is the intentional public API change.

## Changes

### Auth and user package organization

The existing feature modules remain unchanged at the top level. Their files are
now grouped by responsibility:

- `auth`: `config`, `controller`, `dto/request`, `dto/response`, `repository`,
  `security`, `service`, `session`, and `web`;
- `user`: `authorization`, `controller`, `dto/request`, `dto/response`,
  `mapper`, `repository`, `service`, and `web`.

This is a package-only organization change. Endpoint URLs and application
behavior remain unchanged.

### Thin controllers

- Removed the unused HTTP request parameter from `UserController`.
- Centralized authenticated user ID extraction in
  `AuthenticatedUserIdResolver`.
- Moved refresh-cookie construction and clearing to `RefreshCookieFactory`.
- Kept controllers focused on HTTP input, validation, service calls, headers,
  status codes, and response creation.

### Feature-scoped API paths

Routes are defined by:

- `AuthApiPaths`
- `UserApiPaths`
- `AdminUserApiPaths`

Controllers and Spring Security use the same constants. No endpoint URL was
changed, and no global route constants class was introduced.

### DTO extraction

Public and cross-layer records were moved out of controllers and services:

- `CsrfResponse`
- `SessionResponse`
- `AuthenticationResult`
- `ClientContext`
- `IssuedSession`

HTTP DTOs remain inside their feature modules.

### Explicit user mapping

`UserMapper` now converts `UserAccount` entities to `UserResponse`. The response
DTO no longer imports or knows about the JPA entity.

### Standard API responses

Success and error responses now use `ApiResponse`.

Success example:

```json
{
  "success": true,
  "message": "Current user retrieved",
  "data": {},
  "timestamp": "2026-10-06T10:00:00Z"
}
```

Validation error example:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fieldErrors": {
    "email": "Email must be valid"
  },
  "timestamp": "2026-10-06T10:00:00Z"
}
```

Supported error codes:

- `VALIDATION_ERROR`
- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

The HTTP status remains authoritative and is not duplicated in the response
body. `GlobalExceptionHandler` and `RestSecurityErrorHandler` produce the same
response format. The former `ErrorResponse` type was removed.

### Service logging

`ServiceLoggingAspect` now:

- uses monotonic execution-time measurement;
- logs normal completion at DEBUG;
- logs calls exceeding `app.logging.slow-threshold-ms` at WARN;
- logs failures at ERROR;
- never logs method arguments or returned values.

The default slow-service threshold is 500 milliseconds.

### Production configuration

`application-prod.properties` requires production database, JWT, frontend,
CORS, mail, and SMTP values. Production also uses:

```properties
spring.jpa.hibernate.ddl-auto=validate
app.auth.refresh-cookie-secure=true
```

`ProductionConfigurationValidator` rejects startup when:

- refresh cookies are insecure;
- mock password-reset mail would be used;
- JWT signing keys are missing;
- a CORS origin is blank, local, or does not use HTTPS.

The ignored `application-local.properties` continues to hold developer-specific
credentials and local overrides.

### Shared mail package

The existing mail relocation was completed. `EmailService`,
`MockEmailService`, `SmtpEmailService`, and their tests now belong to
`shared/mail`.

## Verification

The completed refactoring was verified with:

```text
Backend Maven tests:       12 passed
Frontend Vitest tests:     67 passed
Frontend production build: passed
Git whitespace validation: passed
```

The post-refactoring documentation audit also confirmed:

- all 65 current Java source files are represented in the source-code guide;
- all 16 current HTTP endpoints match the API reference;
- documented success and error fields match `ApiResponse`;
- local and production profile behavior matches the property files;
- removed types and old `auth/mail` package paths are no longer presented as
  current code.

## Remaining production work

The production profile validates the schema but does not create it. Versioned
database migrations or an independently provisioned schema are still required
before production deployment. Rate limiting, broader integration tests,
monitoring, and managed secret storage also remain production-hardening work.
