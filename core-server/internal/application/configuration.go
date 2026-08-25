package application

import (
	"time"

	"github.com/google/uuid"
)

// Source identifies the Git repository or stored archive used by an application.
type Source struct {
	ID            uuid.UUID
	ApplicationID uuid.UUID
	URL           string
	Ref           *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// ContainerConfig identifies the Dockerfile and runtime settings FlyNow uses
// to build and run an application container.
type ContainerConfig struct {
	RootDirectory   string
	DockerfilePath  string
	ServicePort     int
	HealthCheckPath *string
	AutoDeploy      bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// EnvironmentTarget controls where an environment variable is available.
type EnvironmentTarget string

const (
	TargetBuild   EnvironmentTarget = "build"
	TargetRuntime EnvironmentTarget = "runtime"
	TargetBoth    EnvironmentTarget = "both"
)

// EnvironmentVariable contains encrypted application configuration.
// Ciphertext and Nonce must never be returned directly to an external client.
type EnvironmentVariable struct {
	ID                   uuid.UUID
	ApplicationID        uuid.UUID
	Key                  string
	Ciphertext           []byte
	Nonce                []byte
	EncryptionKeyVersion int
	Target               EnvironmentTarget
	Sensitive            bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
