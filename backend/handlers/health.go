package handlers

import (
	"net/http"
	"time"

	"github.com/AhmedOmani/Bayan/helpers"
)

var startTime = time.Now()

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	dbOK := true
	if err := h.db.Ping(); err != nil {
		dbOK = false
	}

	var studentCount, assignmentCount, submissionCount int
	h.db.QueryRow("SELECT COUNT(*) FROM students").Scan(&studentCount)
	h.db.QueryRow("SELECT COUNT(*) FROM assignments").Scan(&assignmentCount)
	h.db.QueryRow("SELECT COUNT(*) FROM submissions").Scan(&submissionCount)

	uptime := time.Since(startTime).Round(time.Second).String()

	status := "healthy"
	code := http.StatusOK
	if !dbOK {
		status = "unhealthy"
		code = http.StatusServiceUnavailable
	}

	helpers.JSON(w, code, map[string]interface{}{
		"status":      status,
		"uptime":      uptime,
		"database":    dbOK,
		"students":    studentCount,
		"assignments": assignmentCount,
		"submissions": submissionCount,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	})
}
