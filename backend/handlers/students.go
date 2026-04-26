package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/AhmedOmani/Bayan/models"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListStudents(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	gradeID := r.URL.Query().Get("grade_id")

	query := `SELECT s.id, s.full_name, s.phone_number, s.grade_id, g.label, s.status, s.registered_at
		 FROM students s JOIN grades g ON s.grade_id = g.id`

	var conditions []string
	var args []interface{}

	if status != "" {
		args = append(args, status)
		conditions = append(conditions, fmt.Sprintf("s.status = $%d", len(args)))
	}
	if gradeID != "" {
		args = append(args, gradeID)
		conditions = append(conditions, fmt.Sprintf("s.grade_id = $%d", len(args)))
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY s.registered_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	students := []models.StudentResponse{}
	for rows.Next() {
		var s models.StudentResponse
		if err := rows.Scan(&s.ID, &s.FullName, &s.PhoneNumber, &s.GradeID, &s.GradeLabel, &s.Status, &s.RegisteredAt); err != nil {
			continue
		}
		students = append(students, s)
	}

	helpers.JSON(w, http.StatusOK, students)
}

func (h *Handler) ApproveStudent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	result, err := h.db.Exec("UPDATE students SET status = 'ACTIVE' WHERE id = $1 AND status = 'PENDING'", id)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		helpers.Error(w, http.StatusNotFound, "student not found or already approved")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "student approved"})
}

func (h *Handler) BlockStudent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	result, err := h.db.Exec("UPDATE students SET status = 'BLOCKED' WHERE id = $1", id)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		helpers.Error(w, http.StatusNotFound, "student not found")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "student blocked"})
}

func (h *Handler) ChangeStudentGrade(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req models.ChangeGradeRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.GradeID == "" {
		helpers.Error(w, http.StatusBadRequest, "grade_id is required")
		return
	}

	result, err := h.db.Exec("UPDATE students SET grade_id = $1 WHERE id = $2", req.GradeID, id)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		helpers.Error(w, http.StatusNotFound, "student not found")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "student grade updated"})
}
