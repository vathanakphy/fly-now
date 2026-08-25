package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/flynow/core-server/internal/config"
	"github.com/flynow/core-server/internal/database"
	"github.com/flynow/core-server/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("FlyNow stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	logger.Info("starting FlyNow", "env", cfg.Environment)

	startupCtx, cancel := context.WithTimeout(context.Background(), cfg.Database.ConnectTimeout)
	defer cancel()
	postgres, err := database.New(startupCtx, cfg.Database)
	if err != nil {
		return err
	}
	defer func() {
		if err := postgres.Close(); err != nil {
			logger.Error("database close failed", "error", err)
		}
	}()
	logger.Info("database connected", "host", cfg.Database.Host, "database", cfg.Database.Name)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	httpServer := server.New(cfg.HTTP, logger, postgres)
	if err := httpServer.Run(ctx); err != nil {
		return err
	}
	logger.Info("shutting down")
	return nil
}
