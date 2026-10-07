# Fly Now API

Spring Boot backend for the FlyNow PaaS project. The current implementation provides the authentication and user-management foundation described in the first development phase.

## Current modules

```text
com.flynow.api
├── auth/       authentication, JWT, refresh sessions, and passwords
├── user/       profiles, user repositories, and administration
├── entities/   centralized JPA entities and persistence enums
└── shared/     configuration, errors, responses, mail, logging
```

MFA, passkeys, email ownership verification, Flyway, and the former demo Item module are not part of the current application.

## Run locally

1. Create PostgreSQL database `fly_now`.
2. Configure `src/main/resources/application-local.properties` for your local PostgreSQL role.
3. Run:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Swagger: <http://localhost:8080/swagger-ui.html>

Health: <http://localhost:8080/actuator/health>

Build without tests:

```bash
mvn -DskipTests clean package
```

## Documentation

Start with [docs/README.md](docs/README.md). It links to beginner-focused explanations of architecture, configuration, authentication, users, endpoints, database/security decisions, and every Java source file.

## Important development notes

- The build targets Java 21.
- Local schema synchronization uses Hibernate `ddl-auto=update`.
- Spring Boot does not automatically load `.env`; provide variables through the shell, IDE, container runtime, or deployment platform.
- Blank JWT keys generate an ephemeral local RSA pair, so tokens stop working after restart.
- Password-reset messages are logged locally by default. SMTP delivery requires `app.auth.mail-enabled=true`.
- The `prod` profile requires persistent JWT keys, HTTPS CORS origins, secure refresh cookies, database credentials, and SMTP configuration.
- Production still requires controlled migrations, rate limiting, comprehensive integration tests, monitoring, and secret management.
