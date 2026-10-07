# Database and security decisions

## 1. Current schema management

Flyway was removed by project decision. Hibernate uses:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Hibernate reads `@Entity` mappings and creates/adds schema objects. It does not reliably remove old tables or columns. Therefore old development objects from removed features can remain.

This mode is acceptable for the current fresh-development phase. Production should eventually switch to reviewed, versioned migrations and typically use `validate` at runtime.

## 2. Current tables

### `users`

Stores identity, encoded password, role, status, lockout information, token version, and timestamps. Username and email are unique.

### `auth_sessions`

Stores refresh sessions. Important columns include token hash, user, token family, expiry, rotation/revocation information, IP address, and user agent.

### `auth_tokens`

Stores single-use password-reset tokens. Only SHA-256 hashes are stored. `used_at` prevents a second use.

## 3. Why token hashes are stored

A database leak should not immediately reveal usable refresh/reset tokens. The API generates high-entropy random values, gives the raw token to the client, and stores only a SHA-256 hash.

This differs from passwords: human passwords have low entropy and require a slow password encoder such as BCrypt. Random 32/48-byte tokens already have high entropy, so SHA-256 is suitable for lookup/storage.

## 4. Why password hashes use `DelegatingPasswordEncoder`

Passwords use one-way adaptive hashing. The delegating format records which algorithm produced a hash, allowing future upgrades while old hashes remain verifiable. Raw passwords must never be logged, returned, or stored.

## 5. Why JWT uses an immutable user ID

The JWT `sub` claim is the database ID, not username/email. Profiles can change without changing identity. Authorization then loads account state using this stable ID.

## 6. Immediate token revocation

JWTs are normally self-contained and valid until expiry. This implementation adds `token_version`. The version is embedded when the JWT is created and compared with the current user row on every authenticated request.

Password changes, logout-all, role changes, and status changes increment it. Older access tokens then fail validation immediately.

Tradeoff: every authenticated request performs a database lookup. This favors immediate control over fully stateless performance.

## 7. Transactions and locking

- Registration uses a transaction so user creation is atomic.
- Token consumption uses a pessimistic write lock so one reset token cannot be consumed concurrently twice.
- Refresh rotation uses a pessimistic write lock so one refresh token cannot be rotated concurrently twice.
- Refresh reuse revocation uses `noRollbackFor=BadRequestException`, allowing the family-revocation security change to commit even though the request returns an error.
- Login-failure counting uses `REQUIRES_NEW`, so the failure count commits even though authentication fails.

## 8. CSRF, CORS, and cookies

- CSRF defends cookie-backed state-changing actions.
- CORS permits only configured browser frontend origins.
- Allowing credentials is required for refresh cookies.
- `SameSite=Strict` reduces cross-site cookie use.
- `HttpOnly` prevents JavaScript from reading refresh tokens.
- Production must enable the cookie `Secure` flag and HTTPS.

## 9. Error information

Login and forgot-password flows avoid account enumeration. Security and controller failures use the same `ApiResponse` envelope without stack traces. Internal exceptions are logged and converted to a generic `INTERNAL_ERROR` response.

The logging aspect logs service name, duration, and success/failure, but not method arguments or results. Normal completions use DEBUG, calls above the configured threshold use WARN, and failures use ERROR. This avoids accidentally logging passwords and tokens.

## 10. Production gaps

Before production:

- replace Hibernate `update` with reviewed migrations;
- supply the required persistent RSA keys through a secret manager;
- deploy behind HTTPS; the `prod` profile already forces secure cookies;
- supply the SMTP settings required by the `prod` profile;
- add rate limiting for register/login/forgot/reset/refresh;
- expand the focused unit tests into controller, authentication, authorization, repository, and integration coverage;
- add cleanup jobs for expired sessions and tokens;
- configure trusted proxy headers before using client IP for security decisions;
- define backup, recovery, monitoring, and key-rotation procedures;
- review Swagger/Actuator exposure;
- add a controlled initial-administrator bootstrap process.

These are explicit remaining tasks, not behavior currently provided by the code.
