package application

import (
	"time"

	"github.com/google/uuid"
)

// LifecycleState describes whether FlyNow should operate an application.
type LifecycleState string

const (
	LifecycleActive    LifecycleState = "active"
	LifecycleSuspended LifecycleState = "suspended"
)

// Application is the configuration FlyNow needs to manage one application.
type Application struct {
	ID             uuid.UUID
	Name           string
	Slug           string
	LifecycleState LifecycleState
	Source         Source
	Runtime        RuntimeConfig
	Environment    []EnvironmentVariable
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}
