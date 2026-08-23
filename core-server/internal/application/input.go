package application

// Change distinguishes an omitted update field from its zero value.
type Change[T any] struct {
	Value T
	Set   bool
}

// CreateInput contains user-controlled application creation fields.
type CreateInput struct {
	Name            string
	SourceURL       string
	SourceRef       *string
	Runtime         Runtime
	RootDirectory   string
	BuildCommand    *string
	StartCommand    *string
	ServicePort     int
	HealthCheckPath *string
	AutoDeploy      bool
}

// UpdateInput contains fields that may change without replacing omitted values.
type UpdateInput struct {
	Name            Change[string]
	SourceURL       Change[string]
	SourceRef       Change[*string]
	Runtime         Change[Runtime]
	RootDirectory   Change[string]
	BuildCommand    Change[*string]
	StartCommand    Change[*string]
	ServicePort     Change[int]
	HealthCheckPath Change[*string]
	AutoDeploy      Change[bool]
	LifecycleState  Change[LifecycleState]
}

// SetEnvironmentInput contains one plaintext value to encrypt and store.
type SetEnvironmentInput struct {
	Key       string
	Value     string
	Target    EnvironmentTarget
	Sensitive *bool
}
