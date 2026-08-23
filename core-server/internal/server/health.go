package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

type healthChecker interface {
	Ping(context.Context) error
}

type healthHandler struct {
	database healthChecker
}

type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

func (h healthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	response := healthResponse{Status: "healthy", Database: "healthy"}
	status := http.StatusOK
	if err := h.database.Ping(ctx); err != nil {
		response.Status = "unhealthy"
		response.Database = "unhealthy"
		status = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(response)
}
