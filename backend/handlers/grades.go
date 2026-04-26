package handlers

import (
	"net/http"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/AhmedOmani/Bayan/models"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListGrades(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(
		"SELECT id, label, numeric_value, academic_year, created_at FROM grades ORDER BY numeric_value",
	)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	grades := []models.Grade{}
	for rows.Next() {
		var g models.Grade
		if err := rows.Scan(&g.ID, &g.Label, &g.NumericValue, &g.AcademicYear, &g.CreatedAt); err != nil {
			continue
		}
		grades = append(grades, g)
	}

	helpers.JSON(w, http.StatusOK, grades)
}

func (h *Handler) CreateGrade(w http.ResponseWriter, r *http.Request) {
	var req models.CreateGradeRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Label == "" || req.NumericValue == 0 || req.AcademicYear == "" {
		helpers.Error(w, http.StatusBadRequest, "label, numeric_value, and academic_year are required")
		return
	}

	var grade models.Grade
	err := h.db.QueryRow(
		`INSERT INTO grades (label, numeric_value, academic_year)
		 VALUES ($1, $2, $3)
		 RETURNING id, label, numeric_value, academic_year, created_at`,
		req.Label, req.NumericValue, req.AcademicYear,
	).Scan(&grade.ID, &grade.Label, &grade.NumericValue, &grade.AcademicYear, &grade.CreatedAt)

	if err != nil {
		helpers.Error(w, http.StatusConflict, "grade already exists for this academic year")
		return
	}

	helpers.JSON(w, http.StatusCreated, grade)
}

func (h *Handler) DeleteGrade(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM students WHERE grade_id = $1", id).Scan(&count)
	if count > 0 {
		helpers.Error(w, http.StatusConflict, "cannot delete grade with existing students")
		return
	}

	h.db.QueryRow("SELECT COUNT(*) FROM assignments WHERE grade_id = $1", id).Scan(&count)
	if count > 0 {
		helpers.Error(w, http.StatusConflict, "cannot delete grade with existing assignments")
		return
	}

	result, err := h.db.Exec("DELETE FROM grades WHERE id = $1", id)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		helpers.Error(w, http.StatusNotFound, "grade not found")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "grade deleted"})
}
