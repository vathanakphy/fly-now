package server

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeDatabase struct{ err error }

func (f fakeDatabase) Ping(context.Context) error { return f.err }

func TestHealth(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string
	}{
		{name: "healthy", wantStatus: http.StatusOK, wantBody: "{\"status\":\"healthy\",\"database\":\"healthy\"}\n"},
		{name: "database unavailable", err: errors.New("down"), wantStatus: http.StatusServiceUnavailable, wantBody: "{\"status\":\"unhealthy\",\"database\":\"unhealthy\"}\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			healthHandler{database: fakeDatabase{err: tt.err}}.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))
			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if recorder.Body.String() != tt.wantBody {
				t.Fatalf("body = %q, want %q", recorder.Body.String(), tt.wantBody)
			}
		})
	}
}
