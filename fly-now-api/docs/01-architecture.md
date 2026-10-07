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

The response travels back through the same layers. Controllers return DTOs wrapped in `ApiResponse`; entities are not returned directly. Errors use the same envelope with a stable code and optional field errors.

## 2. Package structure

```text
com.flynow.api
├── FlyNowApiApplication.java
├── auth
│   ├── config
│   ├── controller
│   ├── dto
│   │   ├── request
│   │   └── response
│   ├── repository
│   ├── security
│   ├── service
│   │   └── model
│   ├── session
│   └── web
├── entities
├── user
│   ├── authorization
│   ├── controller
│   ├── dto
│   │   ├── request
│   │   └── response
│   ├── mapper
│   ├── repository
│   ├── service
│   └── web
└── shared
    ├── aspect
    ├── config
    ├── exception
    ├── mail
    └── web
```

### `auth`

Owns authentication: credentials, login, JWT creation/validation, refresh sessions, password reset tokens, and security configuration. Its subpackages separate HTTP handling, DTOs, services, repositories, security, configuration, session models, and web helpers.

### `user`

Owns user use cases: the user repository, profiles, self-service profile endpoints, and administrator user management. Its subpackages separate controllers, DTOs, services, persistence, mapping, authorization, and route constants.

### `entities`

Centralizes JPA persistence models and their enums. It currently contains `UserAccount`, `AuthSession`, `AuthToken`, `UserRole`, `AccountStatus`, and `AuthTokenType`. Feature repositories and services import these models, while HTTP DTOs remain inside their feature modules.

### `shared`

Contains application-wide infrastructure used by more than one feature: response envelopes, error handling, CORS/OpenAPI configuration, mail delivery, pagination response structure, and service logging.

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

Both feature modules depend on the centralized `entities` package. The user administrator service is allowed to revoke auth sessions when a role or status changes. This is an intentional cross-feature collaboration through services, not duplicated logic. Entities contain persistence state only; feature behavior and API contracts remain in `auth` and `user`.

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
