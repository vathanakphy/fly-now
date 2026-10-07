# Running and configuration

## 1. Requirements

- JDK 21. The Maven build compiles and runs the project against Java 21.
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

The `prod` profile requires database credentials, persistent RSA keys, a non-local CORS origin, SMTP configuration, and secure refresh cookies. Startup fails when these security requirements are missing.

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

Spring Boot does not automatically load a `.env` file, and this module does not currently provide an `.env.example`. Supply variables through the shell, IDE, Docker Compose, container runtime, or deployment platform.

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
- `mail-enabled=false` (the default) logs password-reset messages through the mock email service.
- `mail-enabled=true` sends password-reset messages through SMTP.
- `compromised-password-check-enabled` enables Spring Security's breached-password check.

### Web

- `app.cors.allowed-origins` lists trusted browser frontend origins.
- CORS credentials are enabled because refresh tokens use cookies.
- Swagger and Actuator paths are configured separately.

### Logging

- `app.logging.slow-threshold-ms` controls when a service call is warned as slow.
- Normal service completions log at DEBUG, slow calls at WARN, and failures at ERROR.

## 7. Production profile

Start the packaged application with:

```bash
java -jar target/fly-now-api.jar --spring.profiles.active=prod
```

`application-prod.properties` requires these environment variables:

| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `CORS_ALLOWED_ORIGINS` | Comma-separated HTTPS frontend origins |
| `FRONTEND_URL` | Public frontend URL used in password-reset links |
| `JWT_KEY_ID` | JWT signing key identifier |
| `JWT_PRIVATE_KEY_BASE64` | PKCS#8 DER private key encoded as Base64 |
| `JWT_PUBLIC_KEY_BASE64` | X.509 DER public key encoded as Base64 |
| `MAIL_FROM` | Password-reset sender address |
| `MAIL_HOST` | SMTP host |
| `MAIL_USERNAME` | SMTP user |
| `MAIL_PASSWORD` | SMTP password |

`MAIL_PORT` is optional and defaults to `587`.

The production profile forces secure refresh cookies, SMTP authentication,
STARTTLS, and `spring.jpa.hibernate.ddl-auto=validate`. It validates the
existing database schema but does not create or migrate it.

`ProductionConfigurationValidator` also rejects missing JWT keys, mock mail,
blank or local CORS origins, and non-HTTPS CORS origins.

## 8. Debug modes

`debug=true` in `application-local.properties` enables Spring Boot diagnostic logging. It does not enable IDE breakpoints.

For a debugger on port 5005:

```bash
mvn spring-boot:run \
  -Dspring-boot.run.profiles=local \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
```

Attach the IDE debugger to `localhost:5005`.

## 9. Build commands

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

## 10. SMTP and password reset

Forgot/reset-password code uses an `EmailService` interface with two implementations:

- `MockEmailService` is selected by default and logs the recipient, reset token, and reset URL to the running application's console.
- `SmtpEmailService` is selected when SMTP is configured and `app.auth.mail-enabled=true`.

For local development, use the default mock to copy the reset URL from the application log. To test real SMTP delivery, Mailpit or MailHog can listen on port 1025. The forgot-password endpoint always returns a generic success response to avoid revealing whether an email exists.
