package application

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func TestServiceCreate(t *testing.T) {
	store := &stubStore{}
	service := NewService(store, nil)

	app, err := service.Create(context.Background(), CreateInput{
		Name:      "  My Example API  ",
		SourceURL: "https://github.com/example/api.git",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if got, want := app.Name, "My Example API"; got != want {
		t.Errorf("Create() name = %q, want %q", got, want)
	}
	if got, want := app.Slug, "my-example-api"; got != want {
		t.Errorf("Create() slug = %q, want %q", got, want)
	}
	if got, want := app.Container.RootDirectory, "."; got != want {
		t.Errorf("Create() root directory = %q, want %q", got, want)
	}
	if got, want := app.Container.DockerfilePath, "Dockerfile"; got != want {
		t.Errorf("Create() Dockerfile path = %q, want %q", got, want)
	}
	if got, want := app.Container.ServicePort, 8080; got != want {
		t.Errorf("Create() service port = %d, want %d", got, want)
	}
	if store.created == nil {
		t.Fatal("Create() did not persist application")
	}
}

func TestServiceCreateRejectsInvalidInput(t *testing.T) {
	tests := []struct {
		name  string
		input CreateInput
		field string
	}{
		{name: "missing name", input: CreateInput{SourceURL: "https://example.com/app.git"}, field: "name"},
		{name: "invalid source", input: CreateInput{Name: "app", SourceURL: "file:///etc/passwd"}, field: "source_url"},
		{name: "unsafe root", input: CreateInput{Name: "app", SourceURL: "https://example.com/app.git", RootDirectory: "../secret"}, field: "root_directory"},
		{name: "unsafe Dockerfile", input: CreateInput{Name: "app", SourceURL: "https://example.com/app.git", DockerfilePath: "../Dockerfile"}, field: "dockerfile_path"},
		{name: "Dockerfile is directory", input: CreateInput{Name: "app", SourceURL: "https://example.com/app.git", DockerfilePath: "."}, field: "dockerfile_path"},
		{name: "invalid port", input: CreateInput{Name: "app", SourceURL: "https://example.com/app.git", ServicePort: 70000}, field: "service_port"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := &stubStore{}
			_, err := NewService(store, nil).Create(context.Background(), test.input)
			var validationErr *ValidationError
			if !errors.As(err, &validationErr) {
				t.Fatalf("Create() error = %v, want ValidationError", err)
			}
			if validationErr.Field != test.field {
				t.Errorf("Create() field = %q, want %q", validationErr.Field, test.field)
			}
			if store.created != nil {
				t.Fatal("Create() persisted invalid application")
			}
		})
	}
}

func TestServiceUpdatePreservesZeroValues(t *testing.T) {
	store := &stubStore{app: validApplication()}
	service := NewService(store, nil)

	app, err := service.Update(context.Background(), store.app.ID.String(), UpdateInput{
		AutoDeploy:     Change[bool]{Set: true, Value: false},
		DockerfilePath: Change[string]{Set: true, Value: "deploy/../Dockerfile.prod"},
	})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if app.Container.AutoDeploy {
		t.Error("Update() auto deploy = true, want false")
	}
	if got, want := app.Container.DockerfilePath, "Dockerfile.prod"; got != want {
		t.Errorf("Update() Dockerfile path = %q, want %q", got, want)
	}
	if store.updated == nil {
		t.Fatal("Update() did not persist application")
	}
}

func TestServiceSetEnvironmentEncryptsValue(t *testing.T) {
	store := &stubStore{app: validApplication()}
	encryptor := &stubEncryptor{}
	service := NewService(store, encryptor)

	sensitive := true
	err := service.SetEnvironment(context.Background(), store.app.Slug, SetEnvironmentInput{
		Key:       "DATABASE_URL",
		Value:     "postgres://secret",
		Target:    TargetRuntime,
		Sensitive: &sensitive,
	})
	if err != nil {
		t.Fatalf("SetEnvironment() error = %v", err)
	}
	if got, want := encryptor.plaintext, "postgres://secret"; got != want {
		t.Errorf("Seal() plaintext = %q, want %q", got, want)
	}
	if got, want := encryptor.additionalData, store.app.ID.String()+"\x00DATABASE_URL"; got != want {
		t.Errorf("Seal() additional data = %q, want %q", got, want)
	}
	if store.environment == nil {
		t.Fatal("SetEnvironment() did not persist variable")
	}
	if got, want := string(store.environment.Ciphertext), "encrypted"; got != want {
		t.Errorf("SetEnvironment() ciphertext = %q, want %q", got, want)
	}
}

func TestServiceEnvironmentHidesEncryptedData(t *testing.T) {
	store := &stubStore{
		app: validApplication(),
		variables: []EnvironmentVariable{{
			Key:        "TOKEN",
			Ciphertext: []byte("encrypted"),
			Nonce:      []byte("nonce"),
		}},
	}
	variables, err := NewService(store, nil).Environment(context.Background(), store.app.Slug)
	if err != nil {
		t.Fatalf("Environment() error = %v", err)
	}
	if len(variables[0].Ciphertext) != 0 || len(variables[0].Nonce) != 0 {
		t.Fatal("Environment() exposed encrypted storage fields")
	}
}

type stubStore struct {
	app         Application
	created     *Application
	updated     *Application
	environment *EnvironmentVariable
	variables   []EnvironmentVariable
}

func (s *stubStore) Create(_ context.Context, app *Application) error {
	copy := *app
	s.created = &copy
	return nil
}

func (s *stubStore) ByID(_ context.Context, id uuid.UUID) (Application, error) {
	if s.app.ID != id {
		return Application{}, ErrNotFound
	}
	return s.app, nil
}

func (s *stubStore) BySlug(_ context.Context, slug string) (Application, error) {
	if s.app.Slug != slug {
		return Application{}, ErrNotFound
	}
	return s.app, nil
}

func (s *stubStore) List(context.Context) ([]Application, error) {
	return []Application{s.app}, nil
}

func (s *stubStore) Update(_ context.Context, app *Application) error {
	copy := *app
	s.updated = &copy
	s.app = copy
	return nil
}

func (s *stubStore) Delete(context.Context, uuid.UUID) error { return nil }

func (s *stubStore) UpsertEnvironment(_ context.Context, variable *EnvironmentVariable) error {
	copy := *variable
	s.environment = &copy
	return nil
}

func (s *stubStore) DeleteEnvironment(context.Context, uuid.UUID, string) error { return nil }

func (s *stubStore) Environment(context.Context, uuid.UUID) ([]EnvironmentVariable, error) {
	return append([]EnvironmentVariable(nil), s.variables...), nil
}

type stubEncryptor struct {
	plaintext      string
	additionalData string
}

func (s *stubEncryptor) Seal(plaintext, additionalData []byte) ([]byte, []byte, int, error) {
	s.plaintext = string(plaintext)
	s.additionalData = string(additionalData)
	return []byte("encrypted"), []byte("nonce"), 1, nil
}

func validApplication() Application {
	return Application{
		ID:             uuid.New(),
		Name:           "Example",
		Slug:           "example",
		LifecycleState: LifecycleActive,
		Source: Source{
			URL: "https://example.com/app.git",
		},
		Container: ContainerConfig{
			RootDirectory:  ".",
			DockerfilePath: "Dockerfile",
			ServicePort:    8080,
			AutoDeploy:     true,
		},
	}
}
