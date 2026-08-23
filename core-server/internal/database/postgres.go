package database

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/flynow/core-server/internal/config"
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Postgres owns both the GORM handle and its underlying connection pool.
type Postgres struct {
	orm *gorm.DB
	sql *sql.DB
}

func New(ctx context.Context, cfg config.Database) (*Postgres, error) {
	orm, err := gorm.Open(gormpostgres.Open(connectionString(cfg)), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		return nil, fmt.Errorf("open PostgreSQL with GORM: %w", err)
	}

	sqlDB, err := orm.DB()
	if err != nil {
		return nil, fmt.Errorf("get PostgreSQL connection pool: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("ping PostgreSQL: %w", err)
	}
	return &Postgres{orm: orm, sql: sqlDB}, nil
}

// ORM returns the GORM handle used by repositories.
func (p *Postgres) ORM() *gorm.DB {
	return p.orm
}

// SQL returns the underlying pool for migrations and low-level operations.
func (p *Postgres) SQL() *sql.DB {
	return p.sql
}

func (p *Postgres) Ping(ctx context.Context) error {
	return p.sql.PingContext(ctx)
}

func (p *Postgres) Close() error {
	return p.sql.Close()
}

func connectionString(cfg config.Database) string {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   cfg.Host + ":" + strconv.Itoa(cfg.Port),
		Path:   cfg.Name,
	}
	query := u.Query()
	query.Set("sslmode", cfg.SSLMode)
	query.Set("connect_timeout", strconv.Itoa(int(cfg.ConnectTimeout.Seconds())))
	u.RawQuery = query.Encode()
	return u.String()
}
