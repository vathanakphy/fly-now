# Authentication module

## 1. What the module does

The auth module proves user identity and manages credentials and sessions. It does not own profile presentation or administrator user APIs; those belong to the user module.

## 2. Registration flow

```text
POST /api/auth/register
    ↓ validate DTO
normalize username/email
    ↓ check duplicates
check password safety (when enabled)
    ↓ encode password
insert ACTIVE user with USER role
    ↓ write REGISTERED audit event
return safe RegisterResponse
```

Passwords are never stored in plain text. `DelegatingPasswordEncoder` currently creates BCrypt hashes and includes an algorithm prefix such as `{bcrypt}`. This permits future algorithm upgrades.

The database unique constraints remain the final defense against two concurrent requests creating the same username or email. The service converts that database failure to HTTP 409 Conflict.

## 3. Login flow

```text
POST /api/auth/login
    ↓ AuthenticationManager
CustomUserDetailsService loads the user
    ↓ PasswordEncoder compares password
check ACTIVE/LOCKED/DISABLED state
    ↓ success
create JWT access token
create random refresh token
store only refresh-token hash
set raw refresh token in HttpOnly cookie
```

Login failures return one generic message. The API does not reveal whether the username exists, the password is wrong, or the account is unavailable.

### Lockout

`AccountSecurityService` counts failures in a separate transaction. After the configured maximum, the account becomes `LOCKED` until `lockedUntil`. A later authentication attempt calls `unlockIfExpired`; when the time has passed the account returns to `ACTIVE`.

## 4. Access tokens

Access tokens are JWTs signed with RSA using RS256. Claims include:

- `jti`: unique token ID;
- `iss`: configured issuer;
- `aud`: configured audience;
- `sub`: immutable database user ID;
- `iat`, `nbf`, `exp`: time constraints;
- `username`: principal display name;
- `roles`: role names converted to Spring authorities;
- `token_version`: account-level revocation version.

Spring Security validates the signature, issuer, audience, time claims, user status, and token version. Because account state is checked in PostgreSQL, disabling a user or incrementing `token_version` invalidates existing access tokens immediately.

Protected requests send:

```http
Authorization: Bearer <access-token>
```

## 5. Refresh tokens

Refresh tokens are opaque random values, not JWTs. The raw value is returned only in the `refresh_token` cookie. PostgreSQL stores its SHA-256 hash.

Cookie protections:

- `HttpOnly`: browser JavaScript cannot read it;
- `SameSite=Strict`: reduces cross-site cookie sending;
- `Secure`: enabled through configuration for HTTPS;
- path `/api/auth`: limits where the browser sends it.

### Rotation

Every successful refresh creates a new session row and revokes the previous row as `ROTATED`. All rotated tokens share a `familyId`.

If an already revoked token is submitted again, the code treats it as possible theft and revokes the whole family with `REUSE_DETECTED`. A pessimistic database lock prevents concurrent requests from rotating the same token successfully twice.

## 6. Logout behavior

- `POST /api/auth/logout` hashes the refresh cookie, revokes that session, and clears the cookie. It does not require a valid access token, so logout still works after access-token expiry.
- `POST /api/auth/logout-all` requires a JWT, revokes every refresh session, increments `token_version`, and clears the cookie. The increment immediately invalidates all access JWTs.
- `DELETE /api/auth/sessions/{id}` can revoke only a session belonging to the authenticated user.

## 7. Password change and recovery

### Change password

The authenticated user provides the current password and a new password. The service verifies the current hash, rejects reusing the same password, checks password safety, stores a new hash, increments `token_version`, and revokes all refresh sessions.

### Forgot password

The endpoint always returns the same response, whether or not the email exists. This prevents account enumeration.

For an existing enabled account, the API generates a random single-use token. The database stores only its hash and the email contains the raw serialized token:

```text
<token-row-uuid>.<random-secret>
```

### Reset password

The service locks and loads the token row, checks its type, expiry, unused state, and hash using constant-time comparison, then marks it consumed. It changes the password and revokes every session.

## 8. CSRF

The API uses bearer tokens for protected resources but also uses a refresh-token cookie. Cookie-authenticated actions need CSRF protection, so Spring Security stores a CSRF token in the `XSRF-TOKEN` cookie.

Client flow:

1. Call `GET /api/auth/csrf` and preserve cookies.
2. Read the token returned in the response body.
3. Send it as `X-XSRF-TOKEN` on state-changing requests.
4. Send the matching cookie as well.

CORS is not CSRF protection. CORS controls which browser origins can read/call the API; CSRF verifies that a state-changing request was intentionally created by the client.

## 9. Authorization

`SecurityConfig` permits registration, login, refresh, logout, password recovery, Swagger, and selected health endpoints. Every other request requires a valid JWT.

JWT `roles` claims become authorities with the `ROLE_` prefix. Therefore claim `ADMIN` becomes `ROLE_ADMIN`, which satisfies:

```java
@PreAuthorize("hasRole('ADMIN')")
```

## 10. Removed features

MFA, passkeys/WebAuthn, and email ownership verification were intentionally removed. There are no endpoints, dependencies, configuration properties, or current Java mappings for them.
