# Ownership authorization

## Purpose

Ownership authorization prevents an authenticated user from reading or
changing another user's application. It is different from authentication:

- authentication establishes who the user is;
- role authorization checks broad privileges such as `ADMIN`;
- ownership authorization checks whether a specific resource belongs to that
  user.

Spring Security recommends method authorization for service-layer enforcement.
FlyNow already enables it with `@EnableMethodSecurity`.

Official reference:
[Spring Security method security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html).

## Components

### `AuthenticatedUserIdResolver`

This component reads the signed JWT `sub` claim and converts it to the database
user ID. It deliberately does not use `Authentication.getName()` because
FlyNow configures the authentication name as the mutable username.

An absent, unauthenticated, unsupported, blank, or malformed principal produces
an empty result. Authorization therefore denies access instead of guessing.

### `OwnershipAuthorization`

This Spring bean is registered as `ownershipAuthorization` for use in
`@PreAuthorize` expressions. It exposes two explicit policies:

```java
isOwner(authentication, persistedOwnerId)
isOwnerOrAdmin(authentication, persistedOwnerId)
```

`isOwner` is the default application policy. Administrator bypass is available
only when a use case explicitly chooses `isOwnerOrAdmin`; being an administrator
does not silently bypass every ownership rule.

## Critical trust rule

The owner ID must come from PostgreSQL, never from JSON, query parameters, or a
client-controlled path value.

Unsafe:

```java
@PreAuthorize("@ownershipAuthorization.isOwner(authentication, #request.ownerId)")
```

The caller can change `request.ownerId` to their own ID.

Correct future application integration:

```java
@Component("applicationAuthorization")
@RequiredArgsConstructor
public class ApplicationAuthorization {

    private final ApplicationRepository repository;
    private final OwnershipAuthorization ownershipAuthorization;

    public boolean isOwner(UUID applicationId, Authentication authentication) {
        return repository.findOwnerIdByIdAndDeletedAtIsNull(applicationId)
                .map(ownerId -> ownershipAuthorization.isOwner(authentication, ownerId))
                .orElse(false);
    }
}
```

The application service then protects operations before executing them:

```java
@PreAuthorize("@applicationAuthorization.isOwner(#applicationId, authentication)")
public ApplicationResponse get(UUID applicationId) {
    // Load and return the application.
}
```

This pattern has three layers:

```text
Authenticated request
        ↓
Spring method interceptor
        ↓
Application authorization bean
        ↓
Repository reads persisted owner_id
        ↓
OwnershipAuthorization compares owner_id with signed JWT subject
        ↓
Allow method call or return 403
```

## Why authorization belongs on services

Controllers are not the only possible callers of services. A future scheduled
job, internal controller, or other adapter could bypass controller-only checks.
Protecting the service method creates defense in depth and keeps the rule next
to the business operation.

Request-level rules in `SecurityFilterChain` still require authentication.
Method security performs the resource-specific ownership decision.

## Missing application integration

The shared ownership components are implemented now. The application entity,
repository, service, and endpoints belong to task 3 and do not exist yet.
Therefore no application endpoint can be annotated today.

When task 3 is implemented:

1. Add an indexed repository query using both application ID and owner ID, or a
   lightweight owner-ID lookup.
2. Add `ApplicationAuthorization` backed by that repository.
3. Add `@PreAuthorize` to every get, update, delete, source, environment, and
   readiness service method.
4. Keep list queries scoped by `owner_id`; do not load every application and
   filter in Java.
5. Return 403 for an authenticated non-owner according to the current task's
   definition of done.

## Example repository query

For direct owner-scoped service queries, prefer constraining ownership in SQL:

```sql
SELECT *
FROM applications
WHERE id = :application_id
  AND owner_id = :authenticated_user_id
  AND deleted_at IS NULL;
```

This prevents accidental cross-user access and avoids loading a resource the
caller does not own.

