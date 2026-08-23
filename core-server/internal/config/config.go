package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment string
	HTTP        HTTP
	Database    Database
}

type HTTP struct {
	Host            string
	Port            int
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

func (c HTTP) Address() string {
	return net.JoinHostPort(c.Host, strconv.Itoa(c.Port))
}

type Database struct {
	Host           string
	Port           int
	Name           string
	User           string
	Password       string
	SSLMode        string
	ConnectTimeout time.Duration
}

func Load() (Config, error) {
	port, err := envInt("FLYNOW_PORT", 8080)
	if err != nil {
		return Config{}, err
	}
	databasePort, err := envInt("DATABASE_PORT", 5432)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		Environment: env("FLYNOW_ENV", "development"),
		HTTP: HTTP{
			Host:            env("FLYNOW_HOST", "0.0.0.0"),
			Port:            port,
			ReadTimeout:     10 * time.Second,
			WriteTimeout:    15 * time.Second,
			IdleTimeout:     60 * time.Second,
			ShutdownTimeout: 10 * time.Second,
		},
		Database: Database{
			Host:           env("DATABASE_HOST", "localhost"),
			Port:           databasePort,
			Name:           env("DATABASE_NAME", "flynow"),
			User:           env("DATABASE_USER", "flynow"),
			Password:       env("DATABASE_PASSWORD", "flynow"),
			SSLMode:        env("DATABASE_SSLMODE", "disable"),
			ConnectTimeout: 5 * time.Second,
		},
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, fmt.Errorf("validate configuration: %w", err)
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if c.Environment == "" {
		return errors.New("FLYNOW_ENV is required")
	}
	if c.HTTP.Host == "" {
		return errors.New("FLYNOW_HOST is required")
	}
	if c.HTTP.Port < 1 || c.HTTP.Port > 65535 {
		return errors.New("FLYNOW_PORT must be between 1 and 65535")
	}
	if c.Database.Host == "" || c.Database.Name == "" || c.Database.User == "" || c.Database.Password == "" {
		return errors.New("database host, name, user, and password are required")
	}
	if c.Database.Port < 1 || c.Database.Port > 65535 {
		return errors.New("DATABASE_PORT must be between 1 and 65535")
	}
	if c.Database.SSLMode == "" {
		return errors.New("DATABASE_SSLMODE is required")
	}
	return nil
}

func env(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	value := env(key, strconv.Itoa(fallback))
	n, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}
	return n, nil
}
