# User module

## 1. Responsibility

The user module owns user data and user-management behavior. Authentication uses this data, but profile and administrator endpoints live in this module.

## 2. User model

`UserAccount` maps to the `users` table.

| Field | Purpose |
|---|---|
| `id` | Stable database identity used as JWT subject. |
| `name` | User-facing name. |
| `username` | Unique normalized login name. |
| `email` | Unique normalized email used for password recovery. |
| `password` | One-way encoded password, never returned. |
| `role` | `USER` or `ADMIN`. |
| `status` | `ACTIVE`, `LOCKED`, or `DISABLED`. |
| `passwordChangedAt` | Security/audit timestamp. |
| `lastLoginAt` | Last successful login. |
| `failedLoginAttempts` | Current failure count. |
| `lockedUntil` | Temporary lock expiration. |
| `tokenVersion` | Invalidates all older JWTs when incremented. |
| `createdAt`, `updatedAt` | Automatically maintained timestamps. |

## 3. Status meaning

- `ACTIVE`: may authenticate and use tokens.
- `LOCKED`: temporarily blocked because of failed login attempts or administrator action.
- `DISABLED`: blocked by an administrator.

Changing status increments `tokenVersion` and revokes refresh sessions so the decision applies immediately.

## 4. Role meaning

- `USER`: normal application user.
- `ADMIN`: may call `/api/admin/users/**`.

The public registration flow always creates `USER`. An existing administrator must grant `ADMIN`. In a fresh database, the first administrator currently needs to be assigned through trusted database/bootstrap administration; no public “create admin” endpoint exists by design.

## 5. Profile operations

### View

`GET /api/users/me` obtains the user ID from the validated JWT subject and loads that exact row. The client cannot provide another user ID.

### Update

`PUT /api/users/me` accepts only `name` and `email`.

Username is intentionally not changed by this operation because it is a login identifier and is also included in JWT claims. Password changes use the dedicated secured password endpoint.

The service normalizes email to lowercase, checks uniqueness, updates the managed entity inside a transaction, and writes a `PROFILE_UPDATED` audit event.

## 6. Safe response DTO

`UserResponse` exposes only:

- ID
- name
- username
- email
- role
- status
- creation time

It never exposes password hashes, lock counters, token versions, or internal session/token data.

## 7. Administrator operations

All routes under `/api/admin/users` are protected by `@PreAuthorize("hasRole('ADMIN')")`.

- List users with stable pagination.
- Change account status.
- Change user role.

Safety rules prevent an administrator from disabling/locking their own account or removing their own administrator role. Role/status changes revoke the target user's refresh sessions and invalidate access tokens.

## 8. Future project ownership

Project ownership is not part of the user module yet because the Project entity has not been implemented. Day 4 should model `Project → owner(UserAccount)` and every project query must constrain by the authenticated user ID. The client must never be trusted to declare ownership.
