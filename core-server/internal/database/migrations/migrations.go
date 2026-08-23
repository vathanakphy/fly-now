package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed *.sql
var files embed.FS

const migrationLockID int64 = 719_691_337

func Run(ctx context.Context, pool *sql.DB) error {
	conn, err := pool.Conn(ctx)
	if err != nil {
		return fmt.Errorf("acquire migration connection: %w", err)
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", migrationLockID); err != nil {
		return fmt.Errorf("lock migrations: %w", err)
	}
	defer func() {
		unlockCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = conn.ExecContext(unlockCtx, "SELECT pg_advisory_unlock($1)", migrationLockID)
	}()

	if _, err := conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version BIGINT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}

	names, err := fs.Glob(files, "*.sql")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	sort.Strings(names)
	for _, name := range names {
		if err := apply(ctx, conn, name); err != nil {
			return err
		}
	}
	return nil
}

func apply(ctx context.Context, conn *sql.Conn, name string) error {
	prefix, _, ok := strings.Cut(name, "_")
	if !ok {
		return fmt.Errorf("invalid migration filename %q", name)
	}
	version, err := strconv.ParseInt(prefix, 10, 64)
	if err != nil {
		return fmt.Errorf("parse migration version %q: %w", name, err)
	}
	var exists bool
	if err := conn.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists); err != nil {
		return fmt.Errorf("check migration %q: %w", name, err)
	}
	if exists {
		return nil
	}

	sql, err := files.ReadFile(name)
	if err != nil {
		return fmt.Errorf("read migration %q: %w", name, err)
	}
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %q: %w", name, err)
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
		return fmt.Errorf("execute migration %q: %w", name, err)
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
		return fmt.Errorf("record migration %q: %w", name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %q: %w", name, err)
	}
	return nil
}
