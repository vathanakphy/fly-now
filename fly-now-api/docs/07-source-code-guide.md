# Source code guide

This is a file-by-file map of the current Java code. Use it when navigating the project in an IDE.

## Application entry point

### `FlyNowApiApplication.java`

Contains `main`. `@SpringBootApplication` enables auto-configuration and scans `com.flynow.api` and every child package for controllers, services, repositories, entities, and configuration.

## Auth HTTP layer

### `auth/controller/AuthController.java`

Defines `/api/auth/**`. It validates HTTP bodies, reads authentication/cookies, captures IP/user-agent context, and delegates business behavior to `AuthService`.

### `auth/web/AuthApiPaths.java`

Defines feature-scoped authentication route constants shared by the controller, security configuration, and cookie policy.

### `auth/web/RefreshCookieFactory.java`

Creates and clears the secure, HttpOnly refresh cookie using the configured security policy.

## Auth application layer

### `auth/service/AuthService.java`

Coordinates registration, login, refresh, logout, password recovery/change, and session management. It is the main authentication use-case layer. It deliberately returns DTOs/session results instead of entities.

### `auth/service/RefreshSessionService.java`

Issues and rotates refresh sessions, detects reuse, revokes tokens/families, lists user sessions, and creates new access JWTs. Public session data uses `SessionResponse`.

### `auth/service/SecureTokenService.java`

Generates cryptographically secure random tokens, hashes them with SHA-256, serializes/parses UUID + secret, compares hashes in constant time, and consumes tokens once.

### `auth/service/model/AuthenticationResult.java`

Carries login response and refresh-cookie material from the service to the controller without exposing session-service implementation types.

### `auth/config/AuthProperties.java`

Binds and validates `app.auth.*`. Typed properties prevent configuration string lookups from being scattered throughout services.

### `user/service/AccountSecurityService.java`

Records failed logins and performs temporary account lockout. `REQUIRES_NEW` ensures failure state can commit separately from a failed login transaction.

### `auth/security/AuthenticatedUserIdResolver.java`

Resolves the stable database user ID from the signed JWT subject. It denies unsupported or malformed authentication instead of falling back to the mutable username.

### `user/authorization/OwnershipAuthorization.java`

Provides reusable owner-only and owner-or-administrator decisions for Spring Security `@PreAuthorize` expressions. Its owner ID must come from persisted data, never from the client.

## Auth DTOs

### `auth/dto/request/RegisterRequest.java`

Defines registration JSON and validation: name, email, username, and a 12–72 character password.

### `auth/dto/response/RegisterResponse.java`

Returns the safe identity fields after registration. It excludes password and internal security state.

### `auth/dto/request/LoginRequest.java`

Accepts nonblank username and password.

### `auth/dto/response/LoginResponse.java`

Returns access token, `Bearer` token type, and lifetime in seconds. The refresh token is intentionally not included because it is sent as an HttpOnly cookie.

### `auth/dto/request/EmailRequest.java`

Reusable validated email body for forgot-password.

### `auth/dto/request/ResetPasswordRequest.java`

Accepts the serialized one-time reset token and validated new password.

### `auth/dto/request/ChangePasswordRequest.java`

Accepts current and new passwords for an authenticated change.

### `auth/dto/response/CsrfResponse.java`

Returns the CSRF header name, parameter name, and token.

### `auth/dto/response/SessionResponse.java`

Returns safe refresh-session metadata without exposing token hashes or raw tokens.

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

Converts filter-chain authentication failures to 401 and authorization failures to 403 using the same `ApiResponse` envelope as controller exceptions.

## Refresh sessions

### `entities/AuthSession.java`

JPA entity for `auth_sessions`. It stores only the refresh-token hash and tracks family, expiry, rotation, revocation, IP, and user agent. `rotate` and `revoke` are controlled state transitions.

### `auth/repository/AuthSessionRepository.java`

Database access for sessions. It includes ownership queries, bulk user/family revocation, and a pessimistically locked token-hash lookup.

### `auth/session/ClientContext.java`

Carries bounded client IP and user-agent metadata from the HTTP layer into session issuance.

### `auth/session/IssuedSession.java`

Carries internally issued access/refresh credentials and expiration metadata between authentication services.

## Single-use auth tokens

### `entities/AuthToken.java`

JPA entity for one-time tokens. It knows whether it is unused/unexpired and can mark itself consumed.

### `entities/AuthTokenType.java`

Currently contains only `PASSWORD_RESET`. An enum prevents arbitrary token-purpose strings in Java.

### `auth/repository/AuthTokenRepository.java`

Loads tokens with a pessimistic lock and invalidates older unused tokens of the same user/type.

## Mail

### `shared/mail/EmailService.java`

Defines the password-reset email contract used by the authentication service.

### `shared/mail/MockEmailService.java`

The default local implementation. It writes the recipient, reset token, and reset URL to the application log.

### `shared/mail/SmtpEmailService.java`

Builds and sends password-reset emails through `JavaMailSender` when `app.auth.mail-enabled=true`. SMTP credentials remain configuration, not source code.

## Centralized user persistence model

### `entities/UserAccount.java`

JPA entity for `users`. Besides field mappings, it owns valid state changes: successful/failed login, timed unlock, password/profile update, JWT invalidation, and administrator role/status changes.

### `entities/UserRole.java`

Defines `USER` and `ADMIN` authorization roles.

### `entities/AccountStatus.java`

Defines `ACTIVE`, `LOCKED`, and `DISABLED` account states.

## User domain

### `user/repository/UserAccountRepository.java`

Provides user lookup and uniqueness checks by username/email plus standard CRUD/pagination.

### `user/controller/UserController.java`

Defines authenticated `/api/users/me` GET/PUT routes. It takes identity from JWT subject rather than accepting a user ID from the client.

### `user/web/UserApiPaths.java` and `user/web/AdminUserApiPaths.java`

Define feature-scoped user and administrator route constants without creating a global route constants class.

### `user/mapper/UserMapper.java`

Maps the centralized `UserAccount` persistence entity to the public `UserResponse` DTO.

### `user/service/UserService.java`

Loads the current profile and updates name/email with normalization, uniqueness protection, and transaction handling.

### `user/controller/AdminUserController.java`

Defines `/api/admin/users/**`. Class-level method security requires `ADMIN`. It supports paginated listing and role/status updates.

### `user/service/AdminUserService.java`

Applies administrator safety rules, updates users, revokes their sessions, and invalidates JWTs through entity state changes.

## User DTOs

### `user/dto/response/UserResponse.java`

Defines the safe public profile representation without importing the persistence entity.

### `user/dto/request/UpdateProfileRequest.java`

Validates profile name and email updates.

### `user/dto/request/UserRoleRequest.java`

Requires a non-null `UserRole` for admin role changes.

### `user/dto/request/AccountStatusRequest.java`

Requires a non-null `AccountStatus` for admin status changes.

## Shared configuration

### `shared/config/AppProperties.java`

Binds shared `app.cors`, `app.pagination`, and `app.logging` settings. Nested classes keep related values grouped.

### `shared/config/ProductionConfigurationValidator.java`

Rejects insecure production startup when refresh cookies, mail delivery, JWT keys, or CORS origins are unsafe or incomplete.

### `shared/config/WebConfig.java`

Applies allowed origins/methods/headers and credentials support through Spring MVC CORS configuration.

### `shared/config/OpenApiConfig.java`

Sets Swagger title/tags and declares the reusable `bearerAuth` JWT security scheme.

## Shared web models

### `shared/web/ApiResponse.java`

Generic success/error envelope containing success flag, stable error code, message, typed data, optional field errors, and timestamp.

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

### `shared/exception/GlobalExceptionHandler.java`

Uses `@RestControllerAdvice` to translate validation and application exceptions to the shared `ApiResponse` envelope. The final generic handler logs internal failures and prevents stack traces from leaking to clients.

## Shared aspect

### `shared/aspect/ServiceLoggingAspect.java`

Wraps every `@Service` method, measures duration, logs normal completion at DEBUG, warns about configured slow calls, and logs failures. It intentionally does not log arguments or returned tokens/passwords.
