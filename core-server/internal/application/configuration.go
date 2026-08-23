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

// Runtime identifies a supported application build strategy.
type Runtime string

const (
	RuntimeAuto       Runtime = "auto"
	RuntimeDockerfile Runtime = "dockerfile"
	RuntimeGo         Runtime = "go"
	RuntimeNode       Runtime = "node"
	RuntimePython     Runtime = "python"
	RuntimeStatic     Runtime = "static"
)

// RuntimeConfig controls how FlyNow builds, starts, and checks an application.
type RuntimeConfig struct {
	Runtime         Runtime
	RootDirectory   string
	BuildCommand    *string
	StartCommand    *string
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
