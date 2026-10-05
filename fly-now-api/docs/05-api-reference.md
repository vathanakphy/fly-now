# API reference

Swagger is the executable reference at <http://localhost:8080/swagger-ui.html>. This document explains authentication requirements and intent.

## 1. Response format

Successful responses use:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {},
  "timestamp": "2026-09-29T10:00:00Z"
}
```

Errors use:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "validationErrors": {
    "email": "Email must be valid"
  },
  "timestamp": "2026-09-29T10:00:00Z"
}
```

## 2. Authentication endpoints

| Method | Path | JWT | Purpose |
|---|---|---:|---|
| GET | `/api/auth/csrf` | No | Obtain CSRF token/cookie. |
| POST | `/api/auth/register` | No | Create an active `USER` account. |
| POST | `/api/auth/login` | No | Authenticate and receive access token + refresh cookie. |
| POST | `/api/auth/refresh` | No | Rotate refresh cookie and issue new access token. |
| POST | `/api/auth/logout` | No | Revoke current refresh session and clear cookie. |
| POST | `/api/auth/logout-all` | Yes | Invalidate every access/refresh session. |
| POST | `/api/auth/forgot-password` | No | Send password-reset instructions when configured. |
| POST | `/api/auth/reset-password` | No | Consume a reset token and replace password. |
| POST | `/api/auth/change-password` | Yes | Verify current password and replace it. |
| GET | `/api/auth/sessions` | Yes | List the caller's refresh sessions. |
| DELETE | `/api/auth/sessions/{sessionId}` | Yes | Revoke one session owned by caller. |

Registration, login, forgot-password, and reset-password do not require authentication or a CSRF token. Cookie-backed refresh and logout requests require a valid CSRF token/cookie pair.

### Register body

```json
{
  "name": "Alice Example",
  "email": "alice@example.com",
  "username": "alice",
  "password": "a-password-with-12-chars"
}
```

Username is 3–50 characters. Password is 12–72 characters. Email and username are normalized to lowercase.

### Login body

```json
{
  "username": "alice",
  "password": "a-password-with-12-chars"
}
```

The JSON response contains `accessToken`, `tokenType`, and `expiresInSeconds`. The response header also sets the `refresh_token` cookie.

### Forgot password body

```json
{
  "email": "alice@example.com"
}
```

### Reset password body

```json
{
  "token": "<uuid>.<secret>",
  "newPassword": "a-new-password-with-12-chars"
}
```

### Change password body

```json
{
  "currentPassword": "current-password",
  "newPassword": "a-new-password-with-12-chars"
}
```

## 3. User endpoints

| Method | Path | JWT | Purpose |
|---|---|---:|---|
| GET | `/api/users/me` | Yes | Return authenticated profile. |
| PUT | `/api/users/me` | Yes | Update name and email. |

Update body:

```json
{
  "name": "Alice Updated",
  "email": "alice.updated@example.com"
}
```

## 4. Administrator endpoints

Every endpoint requires a JWT containing role `ADMIN`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/users` | Paginated user list. |
| PUT | `/api/admin/users/{userId}/status` | Set `ACTIVE`, `LOCKED`, or `DISABLED`. |
| PUT | `/api/admin/users/{userId}/role` | Set `USER` or `ADMIN`. |

Pagination example:

```http
GET /api/admin/users?page=0&size=20&sort=id,asc
```

Status body:

```json
{"status":"DISABLED"}
```

Role body:

```json
{"role":"ADMIN"}
```

## 5. Typical client sequence

```text
GET  /api/auth/csrf
POST /api/auth/register
POST /api/auth/login
GET  /api/users/me          Authorization: Bearer ...
PUT  /api/users/me          Authorization + CSRF
POST /api/auth/refresh      refresh cookie + CSRF
POST /api/auth/logout       refresh cookie + CSRF
```

## 6. Common status codes

- `200`: successful request.
- `201`: user registered.
- `400`: invalid input, expired/invalid action token, or invalid session operation.
- `401`: missing/invalid authentication or wrong credentials.
- `403`: authenticated but not authorized, inactive account, or CSRF failure.
- `404`: requested user/resource does not exist.
- `409`: username or email conflict.
- `500`: unexpected server failure; internal details are not returned.
