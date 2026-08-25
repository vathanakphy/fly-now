ALTER TABLE application_runtime_configs
    RENAME TO application_container_configs;

ALTER TABLE application_container_configs
    ADD COLUMN dockerfile_path TEXT;

UPDATE application_container_configs
SET dockerfile_path = 'Dockerfile'
WHERE dockerfile_path IS NULL;

ALTER TABLE application_container_configs
    ALTER COLUMN dockerfile_path SET NOT NULL,
    ALTER COLUMN dockerfile_path SET DEFAULT 'Dockerfile',
    DROP COLUMN runtime,
    DROP COLUMN build_command,
    DROP COLUMN start_command,
    ADD CONSTRAINT application_container_root_directory_relative
        CHECK (
            root_directory <> ''
            AND root_directory !~ '^/'
            AND root_directory !~ '(^|/)\.\.(/|$)'
        ),
    ADD CONSTRAINT application_container_dockerfile_path_relative
        CHECK (
            dockerfile_path <> ''
            AND dockerfile_path <> '.'
            AND dockerfile_path !~ '^/'
            AND dockerfile_path !~ '(^|/)\.\.(/|$)'
        ),
    ADD CONSTRAINT application_container_service_port_valid
        CHECK (service_port BETWEEN 1 AND 65535),
    ADD CONSTRAINT application_container_health_check_path_valid
        CHECK (health_check_path IS NULL OR health_check_path LIKE '/%');
