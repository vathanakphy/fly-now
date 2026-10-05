# FlyNow Web UI

Stage 4 completes the pre-deployment workflow with runtime configuration, environment-variable
management, grouped readiness validation, the ready-to-deploy state, and application settings:

`Create App → Add Source → Configure → Validate → Ready to Deploy`

The project intentionally stops at `READY_TO_DEPLOY`. It does not deploy applications.

Implemented user-facing routes include `/`, `/login`, `/register`, `/applications`,
`/applications/new`, the application workspace routes, and `/account`.

## Route inventory

| Access                | Routes                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Public                | `/`, `/login`, `/register`                                                                               |
| Authenticated         | `/applications`, `/applications/new`, `/account`                                                         |
| Application workspace | `/applications/:id`, `/source`, `/configuration`, `/environment`, `/settings` under the application path |
| Fallback              | Accessible not-found page for unmatched routes                                                           |

Shared UI includes buttons and form controls, cards, badges, alerts, toast notifications, modal and
confirmation dialogs, tabs, dropdowns, tooltips, responsive tables, empty states, skeletons,
spinners, and progress indicators. Shared layouts cover public, authentication, authenticated shell,
responsive page containers, and application workspaces.

All data operations are exposed through typed services. Configuration and source changes invalidate
prior readiness results, and lifecycle state advances from `DRAFT` to `CONFIGURING` and then to
`READY_TO_DEPLOY` only after every required readiness group passes. Inspection and configuration
paths are project-relative; server filesystem paths are never returned to the UI.

## Technology stack

- React and TypeScript (strict mode)
- Vite
- Tailwind CSS 4 through the official Vite plugin
- React Router
- ESLint and Prettier
- Vitest, Testing Library, and jsdom

## Project structure

```text
src/
  app/                 App composition and providers
  components/          Shared UI and responsive layouts
  data/mock/           Safe JSON-compatible seed records
  features/            Feature hooks and state providers
  hooks/               Shared React hooks
  pages/               Route-level views
  routes/              Route tree and access guards
  services/
    contracts/         UI-facing service interfaces
    mock/              Async in-memory implementations
    api/               Explicit unconfigured HTTP adapters
    serviceProvider.ts Central dependency selection
  styles/              Tailwind theme and base styles
  test/                Test setup
  types/               Shared domain and error types
  utils/               Small shared utilities
```

## Setup and commands

```bash
npm install
cp .env.example .env
npm run dev
```

Other checks:

```bash
npm run test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

The mock login is username `demo` with password `password`.

## Mock-data architecture

React pages call feature hooks or typed service contracts. They never import mock records. The dependency path is:

```text
React component → feature hook → service contract → selected implementation
```

`src/services/serviceProvider.ts` is the only implementation-selection point. With `VITE_DATA_SOURCE=mock`, it supplies asynchronous mock services backed by one shared in-memory store. Safe changed records are serialized to `sessionStorage`, so they survive navigation and reloads during the current browser session. Mock methods include a short delay and throw typed `ServiceError` instances for predictable failure cases.

Initial fictional records live in `src/data/mock/seed.ts`. Only `src/services/mock/store.ts` imports
them. Components never import seeds or mock implementations.

Select the implementation in `.env`:

```bash
VITE_DATA_SOURCE=mock # shared in-memory/session mock store
VITE_DATA_SOURCE=api  # future HTTP adapters
```

Restart Vite after changing the environment value. API mode currently returns the explicit
`API_NOT_CONFIGURED` service error; it never pretends to contact a backend. Implement real HTTP
calls in `src/services/api/` without changing hooks or components.

## Expected API contracts

The authoritative TypeScript request and response shapes are in `src/services/contracts/` and
`src/types/`. A real adapter must map HTTP failures into `ServiceError` with a stable `code`, safe
`message`, and optional field-name-to-message `fieldErrors` map.

| Service                | Request/response responsibility                                                         |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `AuthService`          | Credentials or registration input → safe `User`; restore/logout expose no token details |
| `UserService`          | Profile fields → updated `User`                                                         |
| `ApplicationService`   | Application create/update inputs → `Application`; list/get/delete                       |
| `SourceService`        | GitHub metadata or ZIP metadata/file transfer → `Source`, inspection, and file tree     |
| `ConfigurationService` | Runtime configuration fields → validated `RuntimeConfiguration`                         |
| `EnvironmentService`   | Variable mutation input → metadata with a masked `displayValue` for secrets             |
| `ReadinessService`     | Application ID → grouped `ReadinessResult` with routes and corrective actions           |

The backend must support the controls currently exposed by the UI: session restoration,
registration/login/logout, profile updates, application CRUD, GitHub connect/sync, ZIP upload and
inspection, source replacement/removal, runtime defaults and saves, environment-variable CRUD,
readiness checks/invalidation, and lifecycle updates. Upload progress may be adapter-derived, but
the final operation and errors must follow `SourceService`.

## Secret handling

Secret values are temporary form/request data. Never put plaintext secrets in seed files, logs,
URLs, reusable application state, `localStorage`, or `sessionStorage`. The mock environment service
immediately replaces a submitted secret with a mask and persists only its name, target, secret flag,
and masked display value. Editing may retain the existing secret without retrieving it. A real API
must accept a new secret over a secure transport, return only masked metadata, and distinguish
“retain existing secret” from “replace secret” without returning the stored value.

## Product boundary

The frontend ends at `READY_TO_DEPLOY`. It intentionally contains no deployment action, runtime
logs, deployment history, billing, teams, custom domains, monitoring, Kubernetes or SSH controls,
or CI/CD editor.
