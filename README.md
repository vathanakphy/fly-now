# FlyNow

**Self-hosted application deployment and hosting platform**

FlyNow enables developers to deploy websites and web applications from a GitHub repository or uploaded source archive. It provides a central dashboard for application configuration, deployment, and operational visibility, with support for both Dockerfile-based and command-based deployment.

## Background and Objectives

Deploying an application often involves repeated manual work: preparing a server, installing dependencies, configuring application settings, exposing a public address, and diagnosing failures. These tasks increase the effort required to publish and maintain software.

FlyNow aims to simplify that process through a consistent deployment workflow. Its objectives are to:

- Reduce manual setup for deploying and updating web applications.
- Support projects with or without a Dockerfile.
- Centralize application configuration, access control, and deployment history.
- Provide clear feedback on deployment readiness, failures, and application health.
- Support hosting on infrastructure managed by the developer or team.

## Project Scope

The initial release targets individual developers and small teams deploying applications on a single server for trusted users.

**Included:** account management, application ownership, source management, two deployment modes, public HTTPS access, application lifecycle controls, and deployment visibility.

**Deferred:** multi-server scheduling, public hosting for unrelated customers, multiple-instance scaling, and idle application sleep/wake functionality.

## Core Capabilities

| Area | Planned functionality |
| --- | --- |
| Identity and access | Registration, authentication, password recovery, profiles, and application ownership controls. |
| Application management | Create, configure, update, and remove applications through a web dashboard. |
| Source management | Upload ZIP archives or connect GitHub repositories and branches. |
| Continuous deployment | Synchronize GitHub updates and optionally trigger deployment after a push. |
| Deployment configuration | Select a deployment mode and configure runtime settings, environment variables, secrets, and resource limits. |
| Readiness validation | Identify missing or invalid requirements before deployment. |
| Application hosting | Publish successfully deployed applications through public HTTPS URLs. |
| Lifecycle management | Start, stop, restart, and redeploy applications. |
| Operational visibility | View deployment progress, history, logs, failures, and application health. |
| Recovery | Retry temporary failures and recover from supported interruption scenarios. |

## Deployment Options

A user-provided Dockerfile is optional.

| Mode | User provides | Platform responsibility |
| --- | --- | --- |
| Dockerfile-based | Source code, Dockerfile, and application settings. | Build the image and manage the application container. |
| Command-based | Source code, a supported runtime, and a start command; install and build commands when required. | Prepare the runtime, execute the configured steps, and manage the running application. |

Projects that require no installation or build step can use only their runtime settings and start command. Supported runtimes and versions will be defined during implementation.

The standard user workflow is:

**Create application → Add source → Configure → Validate readiness → Deploy → Monitor**

Readiness confirms that deployment requirements are satisfied. A successful deployment additionally requires the application to start and become accessible.

## Technology Stack

The target stack combines existing backend foundations with planned hosting components.

| Component | Technology | Responsibility |
| --- | --- | --- |
| Web dashboard | React | Application configuration and management interface. |
| Public API | Java 21, Spring Boot | Accounts, permissions, application records, and deployment requests. |
| Deployment core | Go | Deployment execution and application lifecycle management. |
| Database | PostgreSQL | Persistent application, account, configuration, and deployment data. |
| Background jobs | RabbitMQ | Queued deployment processing. |
| Container execution | Docker | Image builds and execution for Dockerfile deployments. |
| Command execution | Managed language runtimes; implementation pending | Execution of configured install, build, and start commands. |
| Routing and HTTPS | Traefik | Public access to hosted applications. |
| Source storage | S3-compatible storage, such as MinIO | Storage for source archives and related artifacts. |
| Local infrastructure | Docker Compose | Local setup of platform services. |

React provides the user interface, Spring Boot manages application requests, and the Go core performs deployment work. Traefik directs website visitors to the hosted applications. Integration of these components into the complete platform is planned.

## Delivery Roadmap

### Stage 1 — Application Preparation

Establish the user-facing workflow for preparing applications for deployment.

**Deliverables:**

- Account management and application ownership.
- Application dashboard and configuration forms.
- ZIP uploads and GitHub source integration.
- Configuration for both deployment modes, including environment variables and secrets.
- Readiness validation with actionable feedback.

**Acceptance milestone:** a user can register, create an application, supply source and configuration, and reach `READY_TO_DEPLOY`. This stage does not execute or host user applications.

### Stage 2 — Deployment and Hosting

Integrate the Go core with the application backend to deliver working hosted applications.

**Deliverables:**

- Background deployment processing for Dockerfile and command-based projects.
- Application startup, health checks, and public HTTPS routing.
- Deployment status, history, and logs.
- Stop, restart, and redeploy operations.
- Failure reporting and retry handling.

**Acceptance milestone:** a trusted user can deploy an application through either supported mode and access it through a working public URL on a single server.

### Stage 3 — Reliability and Operations

Improve maintainability, recovery, and operational confidence.

**Deliverables:**

- Monitoring and recovery from supported failures.
- Backups and documented restoration procedures.
- Improved application isolation and resource management.
- Reliability testing and operational documentation.

**Acceptance milestone:** monitoring, restoration, and recovery procedures are documented and validated through defined test scenarios.

## Implementation Status

| Area | Current status |
| --- | --- |
| Spring Boot API | Authentication and user-management foundations implemented. |
| Go core | Database integration, health checks, application-management foundations, and environment-encryption code implemented. |
| React dashboard | Planned. |
| Deployment and hosting | Deployment queues, command execution, Docker deployment, and routing integration planned. |

The existing Go core follows an earlier Dockerfile-only model and requires changes to support command-based deployment. This README defines the revised product scope; some component documentation still reflects the earlier design.

## Documentation

- [Spring Boot API and setup](fly-now-api/README.md)
- [Go core and setup](core-server/README.md)
- [Detailed infrastructure design](fly-now-api/docs/08-product-and-infrastructure-prd.md)
- [Stage 1 task tracker](https://docs.google.com/spreadsheets/d/13BNfzlQe60Zv9UZv9ogM3RPzD-6GSnr8/edit)
