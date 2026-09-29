# Running and configuration

## 1. Requirements

- JDK 17 or newer. The current Maven build targets Java 17 even if Java 21 is installed.
- Maven
- PostgreSQL listening on `localhost:5432`
- A PostgreSQL database named `fly_now`

## 2. Create the development database

```bash
psql -U postgres -d postgres
```

```sql
CREATE DATABASE fly_now;
```

Exit with:

```text
\q
```

## 3. Run with the local profile

```bash
cd /Users/nak/CADT/projects/fly-now/fly-now-api
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The `local` profile loads both files in this order:

1. `application.properties` — shared/default configuration.
2. `application-local.properties` — local overrides.

The local file currently contains direct development values and is ignored by Git. Update its PostgreSQL username and password to match your machine.

Successful startup contains:

```text
Started FlyNowApiApplication
Tomcat started on port 8080
```

## 4. Important URLs

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/api-docs>
- Health: <http://localhost:8080/actuator/health>
- Info: <http://localhost:8080/actuator/info>

## 5. How Spring resolves properties

The base file uses expressions such as:

```properties
server.port=${SERVER_PORT:8080}
```

This means: use environment variable `SERVER_PORT`; if it is absent, use `8080`.

The local profile uses hardcoded development values. Profile-specific properties override base properties.

Spring Boot does not automatically load a `.env` file. `.env.example` documents variables for a shell, IDE, Docker Compose, or deployment platform. You must export/load them using that tool.

## 6. Configuration groups

### Database

- `spring.datasource.*` selects PostgreSQL and credentials.
- Hikari properties configure the JDBC connection pool.
- `spring.jpa.hibernate.ddl-auto=update` makes Hibernate create/update mapped tables.
- `spring.jpa.open-in-view=false` prevents database sessions from leaking into response rendering.

### JWT

- `app.jwt.issuer` identifies the token issuer.
- `app.jwt.audience` identifies the intended API.
- `app.jwt.key-id` is written into the JWT header.
- RSA private/public keys sign and verify tokens.
- `access-token-minutes` controls access-token lifetime.

Blank RSA keys generate an ephemeral key pair at startup. That is convenient locally, but every restart invalidates previous access tokens. Production must provide persistent keys.

### Authentication

- `refresh-token-days` controls refresh-session lifetime.
- `action-token-minutes` controls password-reset token lifetime.
- `max-failed-logins` controls the lockout threshold.
- `lock-minutes` controls temporary lock duration.
- `refresh-cookie-secure` must be `true` when production uses HTTPS.
- `mail-enabled` controls whether reset emails are sent.
- `compromised-password-check-enabled` enables Spring Security's breached-password check.

### Web

- `app.cors.allowed-origins` lists trusted browser frontend origins.
- CORS credentials are enabled because refresh tokens use cookies.
- Swagger and Actuator paths are configured separately.

## 7. Debug modes

`debug=true` in `application-local.properties` enables Spring Boot diagnostic logging. It does not enable IDE breakpoints.

For a debugger on port 5005:

```bash
mvn spring-boot:run \
  -Dspring-boot.run.profiles=local \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
```

Attach the IDE debugger to `localhost:5005`.

## 8. Build commands

Compile and package without tests:

```bash
mvn -DskipTests clean package
```

The executable JAR is generated at:

```text
target/fly-now-api.jar
```

Run the packaged JAR:

```bash
java -jar target/fly-now-api.jar --spring.profiles.active=local
```

## 9. SMTP and password reset

Forgot/reset-password code exists, but a user can receive the reset link only when SMTP is configured and `app.auth.mail-enabled=true`.

For local development, Mailpit or MailHog can listen on port 1025. When mail is disabled, the forgot-password endpoint still returns a generic success response to avoid revealing whether an email exists, but no message is delivered.
