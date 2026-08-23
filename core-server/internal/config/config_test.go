package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	for _, key := range []string{"FLYNOW_ENV", "FLYNOW_HOST", "FLYNOW_PORT", "DATABASE_HOST", "DATABASE_PORT", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD", "DATABASE_SSLMODE"} {
		t.Setenv(key, "")
	}
	// Empty variables are intentionally invalid; set the documented minimum.
	t.Setenv("FLYNOW_ENV", "development")
	t.Setenv("FLYNOW_HOST", "0.0.0.0")
	t.Setenv("FLYNOW_PORT", "8080")
	t.Setenv("DATABASE_HOST", "localhost")
	t.Setenv("DATABASE_PORT", "5432")
	t.Setenv("DATABASE_NAME", "flynow")
	t.Setenv("DATABASE_USER", "flynow")
	t.Setenv("DATABASE_PASSWORD", "flynow")
	t.Setenv("DATABASE_SSLMODE", "disable")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if got, want := cfg.HTTP.Address(), "0.0.0.0:8080"; got != want {
		t.Fatalf("Address() = %q, want %q", got, want)
	}
}

func TestLoadRejectsInvalidPort(t *testing.T) {
	t.Setenv("FLYNOW_PORT", "not-a-port")
	if _, err := Load(); err == nil {
		t.Fatal("Load() expected an error")
	}
}
