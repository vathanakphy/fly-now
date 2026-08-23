package application

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound           = errors.New("application not found")
	ErrSlugConflict       = errors.New("application slug already exists")
	ErrEnvironmentMissing = errors.New("environment variable not found")
)

// ValidationError describes one invalid application input field.
type ValidationError struct {
	Field   string
	Problem string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Problem)
}
