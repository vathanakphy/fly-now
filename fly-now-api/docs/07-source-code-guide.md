# Source code guide

This is a file-by-file map of the current Java code. Use it when navigating the project in an IDE.

## Application entry point

### `FlyNowApiApplication.java`

Contains `main`. `@SpringBootApplication` enables auto-configuration and scans `com.flynow.api` and every child package for controllers, services, repositories, entities, and configuration.

## Auth root

### `auth/AuthController.java`

Defines `/api/auth/**`. It validates HTTP bodies, reads JWT/cookies, creates/clears the refresh cookie, captures IP/user-agent context, and delegates business behavior to `AuthService`. Its nested `CsrfResponse` describes the CSRF header, parameter, and token.

### `auth/AuthService.java`

Coordinates registration, login, refresh, logout, password recovery/change, and session management. It is the main authentication use-case layer. It deliberately returns DTOs/session results instead of entities.

### `auth/AuthProperties.java`

Binds and validates `app.auth.*`. Typed properties prevent configuration string lookups from being scattered throughout services.

### `auth/AccountSecurityService.java`

Records failed logins and performs temporary account lockout. `REQUIRES_NEW` ensures failure state/audit can commit separately from a failed login transaction.

## Auth DTOs

### `auth/dto/RegisterRequest.java`

Defines registration JSON and validation: name, email, username, and a 12–72 character password.

### `auth/dto/RegisterResponse.java`

Returns the safe identity fields after registration. It excludes password and internal security state.

### `auth/dto/LoginRequest.java`

Accepts nonblank username and password.

### `auth/dto/LoginResponse.java`

Returns access token, `Bearer` token type, and lifetime in seconds. The refresh token is intentionally not included because it is sent as an HttpOnly cookie.

### `auth/dto/EmailRequest.java`

Reusable validated email body for forgot-password.

### `auth/dto/ResetPasswordRequest.java`

Accepts the serialized one-time reset token and validated new password.

### `auth/dto/ChangePasswordRequest.java`

Accepts current and new passwords for an authenticated change.

## Auth security

### `auth/security/SecurityConfig.java`

Builds the `SecurityFilterChain`, password encoder, and authentication manager. It configures CSRF cookies, CORS, stateless session policy, public/protected routes, secure headers, JWT resource-server support, and conversion of JWT roles to `ROLE_*` authorities.

### `auth/security/CustomUserDetailsService.java`

Loads a normalized username from PostgreSQL for Spring's username/password authentication. It maps status to Spring's enabled/locked flags and exposes the user's role as an authority.

### `auth/security/JwtProperties.java`

Binds and validates `app.jwt.*`; converts configured access minutes into seconds for API responses.

### `auth/security/JwtKeyConfig.java`

Loads configured DER/Base64 RSA keys or generates an ephemeral local pair. It creates the JWT encoder/decoder and composes issuer, audience, account-state, lockout, and token-version validators.

### `auth/security/JwtTokenProvider.java`

Creates RS256 access JWTs with identity, role, time, issuer/audience, key ID, and token-version claims.

### `auth/security/PasswordSafetyService.java`

Optionally calls Spring Security's Have I Been Pwned checker and rejects known compromised passwords. It is disabled by default to avoid an external call during local development.

### `auth/security/RestSecurityErrorHandler.java`

Converts filter-chain authentication failures to 401 and authorization failures to 403 using the same `ErrorResponse` JSON structure as controller exceptions.

## Refresh sessions

### `auth/session/AuthSession.java`

JPA entity for `auth_sessions`. It stores only the refresh-token hash and tracks family, expiry, rotation, revocation, IP, and user agent. `rotate` and `revoke` are controlled state transitions.

### `auth/session/AuthSessionRepository.java`

Database access for sessions. It includes ownership queries, bulk user/family revocation, and a pessimistically locked token-hash lookup.

### `auth/session/RefreshSessionService.java`

Issues and rotates refresh sessions, detects reuse, revokes tokens/families, lists user sessions, and creates new access JWTs. Nested records represent request context, internally issued credentials, and safe session views.

## Single-use auth tokens

### `auth/token/AuthToken.java`

JPA entity for one-time tokens. It knows whether it is unused/unexpired and can mark itself consumed.

### `auth/token/AuthTokenType.java`

Currently contains only `PASSWORD_RESET`. An enum prevents arbitrary token-purpose strings in Java.

### `auth/token/AuthTokenRepository.java`

Loads tokens with a pessimistic lock and invalidates older unused tokens of the same user/type.

### `auth/token/SecureTokenService.java`

Generates cryptographically secure random tokens, hashes them with SHA-256, serializes/parses UUID + secret, compares hashes in constant time, and consumes tokens once.

## Mail

### `auth/mail/AuthMailService.java`

Builds and sends password-reset emails through `JavaMailSender`. It returns without sending when mail is disabled. SMTP credentials remain configuration, not source code.

## Audit

### `auth/audit/AuthAuditEvent.java`

JPA entity for security event history: event type, success, optional user, network/client context, detail, and timestamp.

### `auth/audit/AuthAuditEventRepository.java`

Standard Spring Data repository for storing/querying audit events.

### `auth/audit/AuthAuditService.java`

Creates audit rows and truncates untrusted strings to database limits before persistence.

## User domain

### `user/UserAccount.java`

JPA entity for `users`. Besides field mappings, it owns valid state changes: successful/failed login, timed unlock, password/profile update, JWT invalidation, and administrator role/status changes.

### `user/UserAccountRepository.java`

Provides user lookup and uniqueness checks by username/email plus standard CRUD/pagination.

### `user/UserRole.java`

Defines `USER` and `ADMIN` authorization roles.

### `user/AccountStatus.java`

Defines `ACTIVE`, `LOCKED`, and `DISABLED` account states.

### `user/UserController.java`

Defines authenticated `/api/users/me` GET/PUT routes. It takes identity from JWT subject rather than accepting a user ID from the client.

### `user/UserService.java`

Loads the current profile and updates name/email with normalization, uniqueness protection, transaction handling, and audit logging.

### `user/AdminUserController.java`

Defines `/api/admin/users/**`. Class-level method security requires `ADMIN`. It supports paginated listing and role/status updates.

### `user/AdminUserService.java`

Applies administrator safety rules, updates users, revokes their sessions, invalidates JWTs through entity state changes, and records audit events.

## User DTOs

### `user/dto/UserResponse.java`

Maps `UserAccount` to the safe public profile representation.

### `user/dto/UpdateProfileRequest.java`

Validates profile name and email updates.

### `user/dto/UserRoleRequest.java`

Requires a non-null `UserRole` for admin role changes.

### `user/dto/AccountStatusRequest.java`

Requires a non-null `AccountStatus` for admin status changes.

## Shared configuration

### `shared/config/AppProperties.java`

Binds shared `app.cors` and `app.pagination` settings. Nested classes keep related values grouped.

### `shared/config/WebConfig.java`

Applies allowed origins/methods/headers and credentials support through Spring MVC CORS configuration.

### `shared/config/OpenApiConfig.java`

Sets Swagger title/tags and declares the reusable `bearerAuth` JWT security scheme.

## Shared web models

### `shared/web/ApiResponse.java`

Generic success envelope containing success flag, message, typed data, and timestamp.

### `shared/web/PageResponse.java`

Stable pagination envelope that prevents Spring Data's internal `Page` representation from becoming the public API contract.

## Shared exceptions

### `shared/exception/BadRequestException.java`

Represents invalid operations or tokens and maps to HTTP 400.

### `shared/exception/ConflictException.java`

Represents uniqueness/resource conflicts and maps to HTTP 409.

### `shared/exception/ForbiddenException.java`

Represents a known authenticated operation that is not allowed and maps to HTTP 403.

### `shared/exception/ResourceNotFoundException.java`

Represents a missing requested resource and maps to HTTP 404.

### `shared/exception/ErrorResponse.java`

Defines standard error JSON: status, error, message, optional field validation errors, and timestamp.

### `shared/exception/GlobalExceptionHandler.java`

Uses `@RestControllerAdvice` to translate validation and application exceptions to consistent HTTP responses. The final generic handler prevents stack traces from leaking to clients.

## Shared aspect

### `shared/aspect/ServiceLoggingAspect.java`

Wraps every `@Service` method, measures duration, and logs completion/failure. It intentionally does not log arguments or returned tokens/passwords.
