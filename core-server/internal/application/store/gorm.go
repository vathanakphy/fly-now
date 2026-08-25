package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/flynow/core-server/internal/application"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GORM stores application aggregates in PostgreSQL through GORM.
type GORM struct {
	db *gorm.DB
}

var _ application.Store = (*GORM)(nil)

// NewGORM constructs a PostgreSQL-backed application store.
func NewGORM(db *gorm.DB) *GORM {
	return &GORM{db: db}
}

func (s *GORM) Create(ctx context.Context, app *application.Application) error {
	record := recordFromApplication(*app)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Source", "Container", "Environment").Create(&record).Error; err != nil {
			return err
		}
		if err := tx.Create(record.Source).Error; err != nil {
			return err
		}
		if err := tx.Create(record.Container).Error; err != nil {
			return err
		}
		if len(record.Environment) > 0 {
			if err := tx.Create(&record.Environment).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return mapCreateError(err)
	}
	*app = record.application()
	return nil
}

func (s *GORM) ByID(ctx context.Context, id uuid.UUID) (application.Application, error) {
	return s.find(ctx, "id = ?", id)
}

func (s *GORM) BySlug(ctx context.Context, slug string) (application.Application, error) {
	return s.find(ctx, "slug = ?", slug)
}

func (s *GORM) find(ctx context.Context, query string, value any) (application.Application, error) {
	var record applicationRecord
	err := s.db.WithContext(ctx).
		Preload("Source").
		Preload("Container").
		Preload("Environment", func(db *gorm.DB) *gorm.DB { return db.Order("key ASC") }).
		Where(query, value).
		First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return application.Application{}, application.ErrNotFound
	}
	if err != nil {
		return application.Application{}, fmt.Errorf("query application: %w", err)
	}
	return record.application(), nil
}

func (s *GORM) List(ctx context.Context) ([]application.Application, error) {
	var records []applicationRecord
	err := s.db.WithContext(ctx).
		Preload("Source").
		Preload("Container").
		Order("created_at ASC, id ASC").
		Find(&records).Error
	if err != nil {
		return nil, fmt.Errorf("list applications: %w", err)
	}
	apps := make([]application.Application, 0, len(records))
	for _, record := range records {
		apps = append(apps, record.application())
	}
	return apps, nil
}

func (s *GORM) Update(ctx context.Context, app *application.Application) error {
	record := recordFromApplication(*app)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&applicationRecord{}).
			Where("id = ?", record.ID).
			Updates(map[string]any{
				"name":            record.Name,
				"lifecycle_state": record.LifecycleState,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return application.ErrNotFound
		}
		if err := tx.Model(&sourceRecord{}).
			Where("application_id = ?", record.ID).
			Updates(map[string]any{
				"source_url": record.Source.SourceURL,
				"source_ref": record.Source.SourceRef,
			}).Error; err != nil {
			return err
		}
		if err := tx.Model(&containerRecord{}).
			Where("application_id = ?", record.ID).
			Updates(map[string]any{
				"root_directory":    record.Container.RootDirectory,
				"dockerfile_path":   record.Container.DockerfilePath,
				"service_port":      record.Container.ServicePort,
				"health_check_path": record.Container.HealthCheckPath,
				"auto_deploy":       record.Container.AutoDeploy,
			}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, application.ErrNotFound) {
			return err
		}
		return fmt.Errorf("update application aggregate: %w", err)
	}
	return nil
}

func (s *GORM) Delete(ctx context.Context, id uuid.UUID) error {
	result := s.db.WithContext(ctx).Delete(&applicationRecord{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("delete application: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return application.ErrNotFound
	}
	return nil
}

func (s *GORM) UpsertEnvironment(ctx context.Context, variable *application.EnvironmentVariable) error {
	record := recordFromEnvironment(*variable)
	err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "application_id"}, {Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"value_ciphertext",
			"encryption_nonce",
			"encryption_key_version",
			"target",
			"is_sensitive",
			"updated_at",
		}),
	}).Create(&record).Error
	if err != nil {
		return fmt.Errorf("upsert environment variable: %w", err)
	}
	*variable = record.environment()
	return nil
}

func (s *GORM) DeleteEnvironment(ctx context.Context, applicationID uuid.UUID, key string) error {
	result := s.db.WithContext(ctx).
		Where("application_id = ? AND key = ?", applicationID, key).
		Delete(&environmentRecord{})
	if result.Error != nil {
		return fmt.Errorf("delete environment variable: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return application.ErrEnvironmentMissing
	}
	return nil
}

func (s *GORM) Environment(ctx context.Context, applicationID uuid.UUID) ([]application.EnvironmentVariable, error) {
	var records []environmentRecord
	err := s.db.WithContext(ctx).
		Where("application_id = ?", applicationID).
		Order("key ASC").
		Find(&records).Error
	if err != nil {
		return nil, fmt.Errorf("list environment variables: %w", err)
	}
	variables := make([]application.EnvironmentVariable, 0, len(records))
	for _, record := range records {
		variables = append(variables, record.environment())
	}
	return variables, nil
}

func mapCreateError(err error) error {
	var postgresErr *pgconn.PgError
	if errors.As(err, &postgresErr) && postgresErr.ConstraintName == "applications_active_slug_unique" {
		return application.ErrSlugConflict
	}
	return fmt.Errorf("create application aggregate: %w", err)
}
