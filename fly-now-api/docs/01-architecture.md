# Architecture

## 1. High-level request flow

```text
HTTP request
    ↓
Spring Security filter chain
    ↓
Controller
    ↓
Service transaction/business rules
    ↓
Spring Data repository
    ↓
PostgreSQL
```

The response travels back through the same layers. Controllers return DTOs wrapped in `ApiResponse`; entities are not returned directly.

## 2. Package structure

```text
com.flynow.api
├── FlyNowApiApplication.java
├── auth
│   ├── audit
│   ├── dto
│   ├── mail
│   ├── security
│   ├── session
│   └── token
├── user
│   └── dto
└── shared
    ├── aspect
    ├── config
    ├── exception
    └── web
```

### `auth`

Owns authentication: credentials, login, JWT creation/validation, refresh sessions, password reset tokens, security configuration, and authentication audit events.

### `user`

Owns the user model: the `users` table, profiles, roles, account statuses, self-service profile endpoints, and administrator user management.

### `shared`

Contains application-wide infrastructure used by more than one feature: response envelopes, error handling, CORS/OpenAPI configuration, pagination response structure, and service logging.

## 3. Layer responsibilities

### Controller

A controller translates HTTP into Java method calls. It should:

- map URLs and HTTP methods;
- validate request DTOs with `@Valid`;
- read the authenticated JWT principal;
- call a service;
- format the HTTP response.

It should not contain database queries or major business rules.

### Service

A service contains business behavior and transaction boundaries. Examples include:

- rejecting duplicate users;
- rotating a refresh token;
- changing a password and revoking sessions;
- preventing an administrator from disabling their own account.

`@Transactional` makes a group of database changes succeed or fail as one unit.

### Repository

A repository is the database access layer. Extending `JpaRepository<Entity, IdType>` provides common operations such as `findById`, `save`, and pagination. Method names such as `findByUsername` are translated into queries by Spring Data JPA.

### Entity

An entity maps Java fields to a database table. Entities also contain small state-change methods such as `changePassword`, `revoke`, and `recordFailedLogin`. This keeps invalid state changes out of controllers.

### DTO

A DTO is the public API contract. Request DTOs define accepted JSON and validation. Response DTOs prevent internal fields such as password hashes and token hashes from being exposed.

## 4. Dependency injection

Classes use Lombok's `@RequiredArgsConstructor`. Spring creates the class and injects every `final` dependency through the generated constructor.

Example:

```java
private final UserAccountRepository userRepository;
```

The service does not construct the repository. Spring supplies it. This makes components replaceable and testable.

## 5. Module boundary decision

Authentication and users are separate because they change for different reasons:

- `auth` answers “How does someone prove identity and maintain a session?”
- `user` answers “What is a user, profile, role, and account state?”

The auth module is allowed to depend on the user model because authentication must load users. The user administrator service is allowed to revoke auth sessions when a role or status changes. This is an intentional cross-feature collaboration through services, not duplicated logic.

## 6. Spring annotations used frequently

| Annotation | Meaning |
|---|---|
| `@SpringBootApplication` | Starts component scanning and Spring Boot auto-configuration. |
| `@RestController` | Declares an HTTP JSON controller. |
| `@Service` | Declares a business service managed by Spring. |
| `@Configuration` | Declares application configuration and beans. |
| `@Entity` | Maps a class to a database table. |
| `@Transactional` | Defines a database transaction boundary. |
| `@ConfigurationProperties` | Binds related properties into a typed Java object. |
| `@Valid` | Runs Jakarta Bean Validation on a request body. |
| `@PreAuthorize` | Checks authorization before a method executes. |
| `@AuthenticationPrincipal` | Injects the authenticated JWT into a controller method. |

## 7. Naming decisions

- Database entities use singular Java names (`UserAccount`) and explicit table names (`users`).
- Requests and responses end in `Request` and `Response`.
- Repository classes end in `Repository`.
- Services own actions; controllers own routes.
- API routes use plural resources for users: `/api/users`.
- Authentication actions remain under `/api/auth`.
