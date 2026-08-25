// Command migrate applies all pending FlyNow database migrations.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/flynow/core-server/internal/config"
	"github.com/flynow/core-server/internal/database"
	"github.com/flynow/core-server/internal/database/migrations"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("migration failed", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	connectCtx, cancel := context.WithTimeout(ctx, cfg.Database.ConnectTimeout)
	postgres, err := database.New(connectCtx, cfg.Database)
	cancel()
	if err != nil {
		return err
	}
	defer func() {
		if err := postgres.Close(); err != nil {
			logger.Error("database close failed", "error", err)
		}
	}()

	logger.Info("applying database migrations")
	if err := migrations.Run(ctx, postgres.SQL()); err != nil {
		return err
	}
	logger.Info("database migrations complete")
	return nil
}
