package handlers

import (
	"net/http"
	"time"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/AhmedOmani/Bayan/middleware"
	"github.com/AhmedOmani/Bayan/models"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAssignmentRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" || req.GradeID == "" || req.Deadline == "" {
		helpers.Error(w, http.StatusBadRequest, "title, grade_id, and deadline are required")
		return
	}

	if len(req.Questions) == 0 {
		helpers.Error(w, http.StatusBadRequest, "at least one question is required")
		return
	}

	// validate each question
	for i, q := range req.Questions {
		if q.QuestionText == "" {
			helpers.Error(w, http.StatusBadRequest, "question text is required for all questions")
			return
		}
		if q.Explanation == "" {
			helpers.Error(w, http.StatusBadRequest, "explanation is required for all questions")
			return
		}
		if len(q.Choices) < 2 {
			helpers.Error(w, http.StatusBadRequest, "each question needs at least 2 choices")
			return
		}

		correctCount := 0
		for _, c := range q.Choices {
			if c.ChoiceText == "" {
				helpers.Error(w, http.StatusBadRequest, "choice text cannot be empty")
				return
			}
			if c.IsCorrect {
				correctCount++
			}
		}
		if correctCount != 1 {
			helpers.Error(w, http.StatusBadRequest, "each question must have exactly 1 correct answer")
			return
		}
		_ = i
	}

	deadline, err := time.Parse(time.RFC3339, req.Deadline)
	if err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid deadline format, use ISO 8601")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer tx.Rollback()

	var assignmentID string
	err = tx.QueryRow(
		`INSERT INTO assignments (title, description, grade_id, deadline)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		req.Title, req.Description, req.GradeID, deadline,
	).Scan(&assignmentID)

	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "failed to create assignment")
		return
	}

	for order, q := range req.Questions {
		var questionID string
		err = tx.QueryRow(
			`INSERT INTO questions (assignment_id, question_text, explanation, display_order)
			 VALUES ($1, $2, $3, $4) RETURNING id`,
			assignmentID, q.QuestionText, q.Explanation, order+1,
		).Scan(&questionID)

		if err != nil {
			helpers.Error(w, http.StatusInternalServerError, "failed to create question")
			return
		}

		for cOrder, c := range q.Choices {
			_, err = tx.Exec(
				`INSERT INTO choices (question_id, choice_text, is_correct, display_order)
				 VALUES ($1, $2, $3, $4)`,
				questionID, c.ChoiceText, c.IsCorrect, cOrder+1,
			)
			if err != nil {
				helpers.Error(w, http.StatusInternalServerError, "failed to create choice")
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		helpers.Error(w, http.StatusInternalServerError, "failed to save assignment")
		return
	}

	helpers.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":      assignmentID,
		"message": "assignment created",
	})
}

func (h *Handler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	role := r.Context().Value(middleware.RoleKey).(string)

	if role == "teacher" {
		h.listTeacherAssignments(w, r)
	} else {
		h.listStudentAssignments(w, r)
	}
}

func (h *Handler) listTeacherAssignments(w http.ResponseWriter, r *http.Request) {
	gradeFilter := r.URL.Query().Get("grade_id")

	query := `
		SELECT a.id, a.title, a.grade_id, g.label, a.deadline, a.is_published, a.created_at,
			(SELECT COUNT(*) FROM questions q WHERE q.assignment_id = a.id) as question_count,
			(SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count
		FROM assignments a
		JOIN grades g ON a.grade_id = g.id
	`

	var args []interface{}
	if gradeFilter != "" {
		query += " WHERE a.grade_id = $1"
		args = append(args, gradeFilter)
	}

	query += " ORDER BY a.created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	var assignments []models.AssignmentListItem
	for rows.Next() {
		var a models.AssignmentListItem
		if err := rows.Scan(&a.ID, &a.Title, &a.GradeID, &a.GradeLabel, &a.Deadline, &a.IsPublished, &a.CreatedAt, &a.QuestionCount, &a.SubmissionCount); err != nil {
			continue
		}
		assignments = append(assignments, a)
	}

	helpers.JSON(w, http.StatusOK, assignments)
}

func (h *Handler) listStudentAssignments(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value(middleware.UserIDKey).(string)

	// get student grade
	var gradeID string
	err := h.db.QueryRow("SELECT grade_id FROM students WHERE id = $1", studentID).Scan(&gradeID)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, err := h.db.Query(`
		SELECT a.id, a.title, COALESCE(a.description, ''), a.deadline,
			(SELECT COUNT(*) FROM questions q WHERE q.assignment_id = a.id) as question_count,
			EXISTS(SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1) as submitted
		FROM assignments a
		WHERE a.grade_id = $2 AND a.is_published = true
		ORDER BY a.deadline DESC
	`, studentID, gradeID)

	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	var assignments []models.StudentAssignmentItem
	for rows.Next() {
		var a models.StudentAssignmentItem
		if err := rows.Scan(&a.ID, &a.Title, &a.Description, &a.Deadline, &a.QuestionCount, &a.Submitted); err != nil {
			continue
		}
		assignments = append(assignments, a)
	}

	helpers.JSON(w, http.StatusOK, assignments)
}

func (h *Handler) GetAssignment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	role := r.Context().Value(middleware.RoleKey).(string)

	var a models.Assignment
	err := h.db.QueryRow(
		`SELECT id, title, COALESCE(description, ''), grade_id, deadline, is_published, created_at
		 FROM assignments WHERE id = $1`, id,
	).Scan(&a.ID, &a.Title, &a.Description, &a.GradeID, &a.Deadline, &a.IsPublished, &a.CreatedAt)

	if err != nil {
		helpers.Error(w, http.StatusNotFound, "assignment not found")
		return
	}

	// students can only see published assignments for their grade
	if role == "student" {
		if !a.IsPublished {
			helpers.Error(w, http.StatusNotFound, "assignment not found")
			return
		}
		studentID := r.Context().Value(middleware.UserIDKey).(string)
		var gradeID string
		h.db.QueryRow("SELECT grade_id FROM students WHERE id = $1", studentID).Scan(&gradeID)
		if gradeID != a.GradeID {
			helpers.Error(w, http.StatusForbidden, "not your grade")
			return
		}
	}

	// load questions
	qRows, err := h.db.Query(
		`SELECT id, question_text, explanation, display_order, COALESCE(media_url, '')
		 FROM questions WHERE assignment_id = $1 ORDER BY display_order`, id,
	)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer qRows.Close()

	for qRows.Next() {
		var q models.Question
		if err := qRows.Scan(&q.ID, &q.QuestionText, &q.Explanation, &q.DisplayOrder, &q.MediaURL); err != nil {
			continue
		}
		q.AssignmentID = id

		cRows, err := h.db.Query(
			`SELECT id, choice_text, is_correct, display_order
			 FROM choices WHERE question_id = $1 ORDER BY display_order`, q.ID,
		)
		if err != nil {
			continue
		}

		for cRows.Next() {
			var c models.Choice
			if err := cRows.Scan(&c.ID, &c.ChoiceText, &c.IsCorrect, &c.DisplayOrder); err != nil {
				continue
			}
			c.QuestionID = q.ID

			// hide correct answer from students before submission
			if role == "student" {
				c.IsCorrect = false
			}

			q.Choices = append(q.Choices, c)
		}
		cRows.Close()

		// hide explanation from students before they submit
		if role == "student" {
			q.Explanation = ""
		}

		a.Questions = append(a.Questions, q)
	}

	helpers.JSON(w, http.StatusOK, a)
}

func (h *Handler) PublishAssignment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	result, err := h.db.Exec(
		"UPDATE assignments SET is_published = true WHERE id = $1 AND is_published = false", id,
	)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		helpers.Error(w, http.StatusBadRequest, "assignment not found or already published")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "assignment published"})
}
