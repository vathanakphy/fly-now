# Fly Now API

Spring Boot backend for the FlyNow PaaS project. The current implementation provides the authentication and user-management foundation described in the first development phase.

## Current modules

```text
com.flynow.api
├── auth/       authentication, JWT, refresh sessions, passwords, audit
├── user/       user entity, profiles, roles, statuses, administration
└── shared/     configuration, errors, responses, logging
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

- The build currently targets Java 17.
- Local schema synchronization uses Hibernate `ddl-auto=update`.
- Spring Boot does not automatically load `.env`; `.env.example` is a deployment/configuration reference.
- Blank JWT keys generate an ephemeral local RSA pair, so tokens stop working after restart.
- Password-reset delivery requires SMTP and `app.auth.mail-enabled=true`.
- Production still requires controlled migrations, persistent keys, HTTPS, rate limiting, tests, monitoring, and secret management.
