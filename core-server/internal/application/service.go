package application

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strings"
	"unicode"

	"github.com/google/uuid"
)

const (
	defaultRootDirectory  = "."
	defaultDockerfilePath = "Dockerfile"
	defaultServicePort    = 8080
)

var environmentKeyPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// Store persists application aggregates. The service owns this interface
// because it is the consumer of the persistence behavior.
type Store interface {
	Create(context.Context, *Application) error
	ByID(context.Context, uuid.UUID) (Application, error)
	BySlug(context.Context, string) (Application, error)
	List(context.Context) ([]Application, error)
	Update(context.Context, *Application) error
	Delete(context.Context, uuid.UUID) error
	UpsertEnvironment(context.Context, *EnvironmentVariable) error
	DeleteEnvironment(context.Context, uuid.UUID, string) error
	Environment(context.Context, uuid.UUID) ([]EnvironmentVariable, error)
}

// Encryptor protects environment values before persistence.
type Encryptor interface {
	Seal(plaintext, additionalData []byte) (ciphertext, nonce []byte, keyVersion int, err error)
}

type Service struct {
	store     Store
	encryptor Encryptor
}

func NewService(store Store, encryptor Encryptor) *Service {
	return &Service{store: store, encryptor: encryptor}
}

func (s *Service) Create(ctx context.Context, input CreateInput) (Application, error) {
	app := Application{
		ID:             uuid.New(),
		Name:           strings.TrimSpace(input.Name),
		LifecycleState: LifecycleActive,
		Source: Source{
			ID:  uuid.New(),
			URL: strings.TrimSpace(input.SourceURL),
			Ref: cleanOptional(input.SourceRef),
		},
		Container: ContainerConfig{
			RootDirectory:   strings.TrimSpace(input.RootDirectory),
			DockerfilePath:  strings.TrimSpace(input.DockerfilePath),
			ServicePort:     input.ServicePort,
			HealthCheckPath: cleanOptional(input.HealthCheckPath),
			AutoDeploy:      input.AutoDeploy,
		},
	}
	app.Slug = slug(app.Name)
	app.Source.ApplicationID = app.ID
	applyDefaults(&app)
	normalizeContainerPaths(&app)

	if err := validate(app); err != nil {
		return Application{}, err
	}
	if err := s.store.Create(ctx, &app); err != nil {
		return Application{}, fmt.Errorf("create application: %w", err)
	}
	return app, nil
}

func (s *Service) Application(ctx context.Context, idOrSlug string) (Application, error) {
	if id, err := uuid.Parse(idOrSlug); err == nil {
		return s.store.ByID(ctx, id)
	}
	return s.store.BySlug(ctx, idOrSlug)
}

func (s *Service) Applications(ctx context.Context) ([]Application, error) {
	return s.store.List(ctx)
}

func (s *Service) Update(ctx context.Context, idOrSlug string, input UpdateInput) (Application, error) {
	app, err := s.Application(ctx, idOrSlug)
	if err != nil {
		return Application{}, err
	}

	applyUpdate(&app, input)
	normalizeContainerPaths(&app)
	if err := validate(app); err != nil {
		return Application{}, err
	}
	if err := s.store.Update(ctx, &app); err != nil {
		return Application{}, fmt.Errorf("update application %q: %w", idOrSlug, err)
	}
	return app, nil
}

func (s *Service) Delete(ctx context.Context, idOrSlug string) error {
	app, err := s.Application(ctx, idOrSlug)
	if err != nil {
		return err
	}
	if err := s.store.Delete(ctx, app.ID); err != nil {
		return fmt.Errorf("delete application %q: %w", idOrSlug, err)
	}
	return nil
}

func (s *Service) SetEnvironment(ctx context.Context, idOrSlug string, input SetEnvironmentInput) error {
	app, err := s.Application(ctx, idOrSlug)
	if err != nil {
		return err
	}
	if err := validateEnvironment(input); err != nil {
		return err
	}
	if s.encryptor == nil {
		return errors.New("environment encryption is not configured")
	}

	ciphertext, nonce, keyVersion, err := s.encryptor.Seal(
		[]byte(input.Value),
		environmentAdditionalData(app.ID, input.Key),
	)
	if err != nil {
		return fmt.Errorf("encrypt environment variable %q: %w", input.Key, err)
	}
	variable := EnvironmentVariable{
		ID:                   uuid.New(),
		ApplicationID:        app.ID,
		Key:                  input.Key,
		Ciphertext:           ciphertext,
		Nonce:                nonce,
		EncryptionKeyVersion: keyVersion,
		Target:               input.Target,
		Sensitive:            true,
	}
	if input.Sensitive != nil {
		variable.Sensitive = *input.Sensitive
	}
	if err := s.store.UpsertEnvironment(ctx, &variable); err != nil {
		return fmt.Errorf("set environment variable %q: %w", input.Key, err)
	}
	return nil
}

func (s *Service) DeleteEnvironment(ctx context.Context, idOrSlug, key string) error {
	app, err := s.Application(ctx, idOrSlug)
	if err != nil {
		return err
	}
	if !environmentKeyPattern.MatchString(key) {
		return &ValidationError{Field: "key", Problem: "must be a valid environment variable name"}
	}
	if err := s.store.DeleteEnvironment(ctx, app.ID, key); err != nil {
		return fmt.Errorf("delete environment variable %q: %w", key, err)
	}
	return nil
}

func (s *Service) Environment(ctx context.Context, idOrSlug string) ([]EnvironmentVariable, error) {
	app, err := s.Application(ctx, idOrSlug)
	if err != nil {
		return nil, err
	}
	variables, err := s.store.Environment(ctx, app.ID)
	if err != nil {
		return nil, fmt.Errorf("list environment variables: %w", err)
	}
	for i := range variables {
		variables[i].Ciphertext = nil
		variables[i].Nonce = nil
	}
	return variables, nil
}

func applyDefaults(app *Application) {
	if app.Container.RootDirectory == "" {
		app.Container.RootDirectory = defaultRootDirectory
	}
	if app.Container.DockerfilePath == "" {
		app.Container.DockerfilePath = defaultDockerfilePath
	}
	if app.Container.ServicePort == 0 {
		app.Container.ServicePort = defaultServicePort
	}
}

func normalizeContainerPaths(app *Application) {
	if app.Container.RootDirectory != "" {
		app.Container.RootDirectory = path.Clean(app.Container.RootDirectory)
	}
	if app.Container.DockerfilePath != "" {
		app.Container.DockerfilePath = path.Clean(app.Container.DockerfilePath)
	}
}

func applyUpdate(app *Application, input UpdateInput) {
	if input.Name.Set {
		app.Name = strings.TrimSpace(input.Name.Value)
	}
	if input.SourceURL.Set {
		app.Source.URL = strings.TrimSpace(input.SourceURL.Value)
	}
	if input.SourceRef.Set {
		app.Source.Ref = cleanOptional(input.SourceRef.Value)
	}
	if input.RootDirectory.Set {
		app.Container.RootDirectory = strings.TrimSpace(input.RootDirectory.Value)
	}
	if input.DockerfilePath.Set {
		app.Container.DockerfilePath = strings.TrimSpace(input.DockerfilePath.Value)
	}
	if input.ServicePort.Set {
		app.Container.ServicePort = input.ServicePort.Value
	}
	if input.HealthCheckPath.Set {
		app.Container.HealthCheckPath = cleanOptional(input.HealthCheckPath.Value)
	}
	if input.AutoDeploy.Set {
		app.Container.AutoDeploy = input.AutoDeploy.Value
	}
	if input.LifecycleState.Set {
		app.LifecycleState = input.LifecycleState.Value
	}
}

func validate(app Application) error {
	switch {
	case app.Name == "":
		return &ValidationError{Field: "name", Problem: "is required"}
	case len(app.Name) > 100:
		return &ValidationError{Field: "name", Problem: "must be at most 100 bytes"}
	case app.Slug == "":
		return &ValidationError{Field: "name", Problem: "must contain an ASCII letter or number"}
	case len(app.Slug) > 63:
		return &ValidationError{Field: "name", Problem: "produces a slug longer than 63 bytes"}
	case app.LifecycleState != LifecycleActive && app.LifecycleState != LifecycleSuspended:
		return &ValidationError{Field: "lifecycle_state", Problem: "must be active or suspended"}
	}

	if err := validateSourceURL(app.Source.URL); err != nil {
		return err
	}
	if err := validateRelativePath("root_directory", app.Container.RootDirectory, true); err != nil {
		return err
	}
	if err := validateRelativePath("dockerfile_path", app.Container.DockerfilePath, false); err != nil {
		return err
	}
	if app.Container.ServicePort < 1 || app.Container.ServicePort > 65535 {
		return &ValidationError{Field: "service_port", Problem: "must be between 1 and 65535"}
	}
	if app.Container.HealthCheckPath != nil && !strings.HasPrefix(*app.Container.HealthCheckPath, "/") {
		return &ValidationError{Field: "health_check_path", Problem: "must start with /"}
	}
	return nil
}

func validateSourceURL(value string) error {
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Host == "" {
		return &ValidationError{Field: "source_url", Problem: "must be an absolute URL"}
	}
	switch parsed.Scheme {
	case "git", "http", "https", "s3", "ssh":
		return nil
	default:
		return &ValidationError{Field: "source_url", Problem: "uses an unsupported scheme"}
	}
}

func validateRelativePath(field, value string, allowCurrentDirectory bool) error {
	cleaned := path.Clean(value)
	if value == "" || path.IsAbs(value) || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return &ValidationError{Field: field, Problem: "must be a relative path inside the source directory"}
	}
	if !allowCurrentDirectory && cleaned == "." {
		return &ValidationError{Field: field, Problem: "must identify a file"}
	}
	return nil
}

func validateEnvironment(input SetEnvironmentInput) error {
	if !environmentKeyPattern.MatchString(input.Key) {
		return &ValidationError{Field: "key", Problem: "must be a valid environment variable name"}
	}
	switch input.Target {
	case TargetBuild, TargetRuntime, TargetBoth:
		return nil
	default:
		return &ValidationError{Field: "target", Problem: "must be build, runtime, or both"}
	}
}

func environmentAdditionalData(applicationID uuid.UUID, key string) []byte {
	return fmt.Appendf(nil, "%s\x00%s", applicationID, key)
}

func slug(value string) string {
	var builder strings.Builder
	separator := false
	for _, r := range strings.ToLower(value) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			if separator && builder.Len() > 0 {
				builder.WriteByte('-')
			}
			builder.WriteRune(r)
			separator = false
		case unicode.IsSpace(r), r == '-', r == '_':
			separator = true
		default:
			separator = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func cleanOptional(value *string) *string {
	if value == nil {
		return nil
	}
	cleaned := strings.TrimSpace(*value)
	if cleaned == "" {
		return nil
	}
	return &cleaned
}
