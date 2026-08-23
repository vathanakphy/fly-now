CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- APPLICATIONS
-- =========================================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(63) NOT NULL,

    lifecycle_state VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX applications_active_slug_unique
    ON applications (slug)
    WHERE deleted_at IS NULL;


-- =========================================================
-- APPLICATION SOURCES
-- The application layer determines whether the URL is:
-- - Git repository
-- - Object storage ZIP/archive
-- - Other supported source
-- =========================================================

CREATE TABLE application_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL UNIQUE
        REFERENCES applications(id)
        ON DELETE CASCADE,

    source_url TEXT NOT NULL,

    -- Optional branch, tag, commit SHA, etc.
    -- NULL for uploaded archives/object-storage sources
    source_ref VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- APPLICATION RUNTIME CONFIG
-- =========================================================

CREATE TABLE application_runtime_configs (
    application_id UUID PRIMARY KEY
        REFERENCES applications(id)
        ON DELETE CASCADE,

    runtime VARCHAR(30) NOT NULL DEFAULT 'auto',

    root_directory TEXT NOT NULL DEFAULT '.',

    build_command TEXT,
    start_command TEXT,

    service_port INTEGER NOT NULL DEFAULT 8080,

    health_check_path TEXT,

    auto_deploy BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- APPLICATION ENVIRONMENT VARIABLES
-- Encryption is handled by the application layer
-- =========================================================

CREATE TABLE application_environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES applications(id)
        ON DELETE CASCADE,

    key VARCHAR(255) NOT NULL,

    value_ciphertext BYTEA NOT NULL,
    encryption_nonce BYTEA NOT NULL,
    encryption_key_version INTEGER NOT NULL,

    target VARCHAR(20) NOT NULL DEFAULT 'runtime',
    is_sensitive BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (application_id, key)
);

CREATE INDEX application_environment_variables_application_id_idx
    ON application_environment_variables(application_id);


-- =========================================================
-- DEPLOYMENTS
-- One application can have many deployment attempts
-- =========================================================

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES applications(id)
        ON DELETE CASCADE,

    status VARCHAR(30) NOT NULL DEFAULT 'queued',

    trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual',

    -- Resolved source revision for this deployment.
    -- Example: Git commit SHA or uploaded archive checksum.
    source_revision VARCHAR(255),

    -- Built image stored in your image registry.
    image_reference TEXT,

    -- Runtime/container instance identifier.
    runtime_instance_id TEXT,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX deployments_application_id_idx
    ON deployments(application_id);

CREATE INDEX deployments_application_created_at_idx
    ON deployments(application_id, created_at DESC);

CREATE INDEX deployments_status_idx
    ON deployments(status);
