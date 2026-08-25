package store

import (
	"time"

	"github.com/flynow/core-server/internal/application"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type applicationRecord struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name           string
	Slug           string
	LifecycleState string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt
	Source         *sourceRecord       `gorm:"foreignKey:ApplicationID"`
	Container      *containerRecord    `gorm:"foreignKey:ApplicationID"`
	Environment    []environmentRecord `gorm:"foreignKey:ApplicationID"`
}

func (applicationRecord) TableName() string { return "applications" }

type sourceRecord struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ApplicationID uuid.UUID
	SourceURL     string
	SourceRef     *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (sourceRecord) TableName() string { return "application_sources" }

type containerRecord struct {
	ApplicationID   uuid.UUID `gorm:"type:uuid;primaryKey"`
	RootDirectory   string
	DockerfilePath  string
	ServicePort     int
	HealthCheckPath *string
	AutoDeploy      bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (containerRecord) TableName() string { return "application_container_configs" }

type environmentRecord struct {
	ID                   uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ApplicationID        uuid.UUID
	Key                  string
	ValueCiphertext      []byte
	EncryptionNonce      []byte
	EncryptionKeyVersion int
	Target               string
	IsSensitive          bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (environmentRecord) TableName() string {
	return "application_environment_variables"
}

func recordFromApplication(app application.Application) applicationRecord {
	record := applicationRecord{
		ID:             app.ID,
		Name:           app.Name,
		Slug:           app.Slug,
		LifecycleState: string(app.LifecycleState),
		CreatedAt:      app.CreatedAt,
		UpdatedAt:      app.UpdatedAt,
		Source:         sourceRecordFromSource(app.Source),
		Container:      containerRecordFromContainer(app.ID, app.Container),
	}
	if app.DeletedAt != nil {
		record.DeletedAt = gorm.DeletedAt{Time: *app.DeletedAt, Valid: true}
	}
	for _, variable := range app.Environment {
		record.Environment = append(record.Environment, recordFromEnvironment(variable))
	}
	return record
}

func (r applicationRecord) application() application.Application {
	app := application.Application{
		ID:             r.ID,
		Name:           r.Name,
		Slug:           r.Slug,
		LifecycleState: application.LifecycleState(r.LifecycleState),
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
	if r.DeletedAt.Valid {
		deletedAt := r.DeletedAt.Time
		app.DeletedAt = &deletedAt
	}
	if r.Source != nil {
		app.Source = r.Source.source()
	}
	if r.Container != nil {
		app.Container = r.Container.container()
	}
	for _, variable := range r.Environment {
		app.Environment = append(app.Environment, variable.environment())
	}
	return app
}

func sourceRecordFromSource(source application.Source) *sourceRecord {
	return &sourceRecord{
		ID:            source.ID,
		ApplicationID: source.ApplicationID,
		SourceURL:     source.URL,
		SourceRef:     source.Ref,
		CreatedAt:     source.CreatedAt,
		UpdatedAt:     source.UpdatedAt,
	}
}

func (r sourceRecord) source() application.Source {
	return application.Source{
		ID:            r.ID,
		ApplicationID: r.ApplicationID,
		URL:           r.SourceURL,
		Ref:           r.SourceRef,
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
	}
}

func containerRecordFromContainer(applicationID uuid.UUID, container application.ContainerConfig) *containerRecord {
	return &containerRecord{
		ApplicationID:   applicationID,
		RootDirectory:   container.RootDirectory,
		DockerfilePath:  container.DockerfilePath,
		ServicePort:     container.ServicePort,
		HealthCheckPath: container.HealthCheckPath,
		AutoDeploy:      container.AutoDeploy,
		CreatedAt:       container.CreatedAt,
		UpdatedAt:       container.UpdatedAt,
	}
}

func (r containerRecord) container() application.ContainerConfig {
	return application.ContainerConfig{
		RootDirectory:   r.RootDirectory,
		DockerfilePath:  r.DockerfilePath,
		ServicePort:     r.ServicePort,
		HealthCheckPath: r.HealthCheckPath,
		AutoDeploy:      r.AutoDeploy,
		CreatedAt:       r.CreatedAt,
		UpdatedAt:       r.UpdatedAt,
	}
}

func recordFromEnvironment(variable application.EnvironmentVariable) environmentRecord {
	return environmentRecord{
		ID:                   variable.ID,
		ApplicationID:        variable.ApplicationID,
		Key:                  variable.Key,
		ValueCiphertext:      variable.Ciphertext,
		EncryptionNonce:      variable.Nonce,
		EncryptionKeyVersion: variable.EncryptionKeyVersion,
		Target:               string(variable.Target),
		IsSensitive:          variable.Sensitive,
		CreatedAt:            variable.CreatedAt,
		UpdatedAt:            variable.UpdatedAt,
	}
}

func (r environmentRecord) environment() application.EnvironmentVariable {
	return application.EnvironmentVariable{
		ID:                   r.ID,
		ApplicationID:        r.ApplicationID,
		Key:                  r.Key,
		Ciphertext:           r.ValueCiphertext,
		Nonce:                r.EncryptionNonce,
		EncryptionKeyVersion: r.EncryptionKeyVersion,
		Target:               application.EnvironmentTarget(r.Target),
		Sensitive:            r.IsSensitive,
		CreatedAt:            r.CreatedAt,
		UpdatedAt:            r.UpdatedAt,
	}
}
