package handlers

import (
	"database/sql"
	"net/http"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/AhmedOmani/Bayan/middleware"
	"github.com/AhmedOmani/Bayan/models"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) SubmitAssignment(w http.ResponseWriter, r *http.Request) {
	assignmentID := chi.URLParam(r, "id")
	studentID := r.Context().Value(middleware.UserIDKey).(string)

	var req models.SubmitRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// check assignment exists and is published
	var gradeID string
	var isPublished bool
	err := h.db.QueryRow(
		"SELECT grade_id, is_published FROM assignments WHERE id = $1", assignmentID,
	).Scan(&gradeID, &isPublished)

	if err == sql.ErrNoRows {
		helpers.Error(w, http.StatusNotFound, "assignment not found")
		return
	}
	if !isPublished {
		helpers.Error(w, http.StatusBadRequest, "assignment not published")
		return
	}

	// check student belongs to the right grade
	var studentGradeID string
	h.db.QueryRow("SELECT grade_id FROM students WHERE id = $1", studentID).Scan(&studentGradeID)
	if studentGradeID != gradeID {
		helpers.Error(w, http.StatusForbidden, "not your grade")
		return
	}

	// check not already submitted
	var existing int
	h.db.QueryRow(
		"SELECT COUNT(*) FROM submissions WHERE student_id = $1 AND assignment_id = $2",
		studentID, assignmentID,
	).Scan(&existing)
	if existing > 0 {
		helpers.Error(w, http.StatusConflict, "already submitted")
		return
	}

	if len(req.Answers) == 0 {
		helpers.Error(w, http.StatusBadRequest, "no answers provided")
		return
	}

	// grade the answers
	score := 0
	var details []models.SubmitAnswerDetail

	for _, ans := range req.Answers {
		var questionText, explanation string
		err := h.db.QueryRow(
			"SELECT question_text, explanation FROM questions WHERE id = $1 AND assignment_id = $2",
			ans.QuestionID, assignmentID,
		).Scan(&questionText, &explanation)
		if err != nil {
			continue
		}

		// get selected choice text
		var selectedText string
		h.db.QueryRow("SELECT choice_text FROM choices WHERE id = $1", ans.ChoiceID).Scan(&selectedText)

		// get correct choice text
		var correctText string
		h.db.QueryRow(
			"SELECT choice_text FROM choices WHERE question_id = $1 AND is_correct = true",
			ans.QuestionID,
		).Scan(&correctText)

		// check if selected choice is correct
		var isCorrect bool
		h.db.QueryRow(
			"SELECT is_correct FROM choices WHERE id = $1 AND question_id = $2",
			ans.ChoiceID, ans.QuestionID,
		).Scan(&isCorrect)

		if isCorrect {
			score++
		}

		details = append(details, models.SubmitAnswerDetail{
			QuestionText:   questionText,
			Explanation:    explanation,
			SelectedChoice: selectedText,
			CorrectChoice:  correctText,
			IsCorrect:      isCorrect,
		})
	}

	totalQuestions := len(req.Answers)

	// save submission in a transaction
	tx, err := h.db.Begin()
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer tx.Rollback()

	var submissionID string
	err = tx.QueryRow(
		`INSERT INTO submissions (student_id, assignment_id, score, total_questions)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		studentID, assignmentID, score, totalQuestions,
	).Scan(&submissionID)

	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "failed to save submission")
		return
	}

	for _, ans := range req.Answers {
		var isCorrect bool
		h.db.QueryRow(
			"SELECT is_correct FROM choices WHERE id = $1", ans.ChoiceID,
		).Scan(&isCorrect)

		_, err = tx.Exec(
			`INSERT INTO answers (submission_id, question_id, selected_choice_id, is_correct)
			 VALUES ($1, $2, $3, $4)`,
			submissionID, ans.QuestionID, ans.ChoiceID, isCorrect,
		)
		if err != nil {
			helpers.Error(w, http.StatusInternalServerError, "failed to save answers")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		helpers.Error(w, http.StatusInternalServerError, "failed to save submission")
		return
	}

	percentage := 0
	if totalQuestions > 0 {
		percentage = (score * 100) / totalQuestions
	}

	helpers.JSON(w, http.StatusCreated, models.SubmitResult{
		ID:             submissionID,
		Score:          score,
		TotalQuestions: totalQuestions,
		Percentage:     percentage,
		Details:        details,
	})
}

func (h *Handler) ListSubmissions(w http.ResponseWriter, r *http.Request) {
	assignmentID := chi.URLParam(r, "id")

	rows, err := h.db.Query(`
		SELECT s.id, st.full_name, s.score, s.total_questions, s.submitted_at
		FROM submissions s
		JOIN students st ON s.student_id = st.id
		WHERE s.assignment_id = $1
		ORDER BY s.submitted_at DESC
	`, assignmentID)

	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	var items []models.SubmissionListItem
	for rows.Next() {
		var s models.SubmissionListItem
		if err := rows.Scan(&s.ID, &s.StudentName, &s.Score, &s.TotalQuestions, &s.SubmittedAt); err != nil {
			continue
		}
		if s.TotalQuestions > 0 {
			s.Percentage = (s.Score * 100) / s.TotalQuestions
		}
		items = append(items, s)
	}

	helpers.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetSubmission(w http.ResponseWriter, r *http.Request) {
	submissionID := chi.URLParam(r, "submissionId")

	// get submission info
	var studentName string
	var score, totalQuestions int
	var submittedAt, assignmentTitle string

	err := h.db.QueryRow(`
		SELECT st.full_name, s.score, s.total_questions, s.submitted_at, a.title
		FROM submissions s
		JOIN students st ON s.student_id = st.id
		JOIN assignments a ON s.assignment_id = a.id
		WHERE s.id = $1
	`, submissionID).Scan(&studentName, &score, &totalQuestions, &submittedAt, &assignmentTitle)

	if err != nil {
		helpers.Error(w, http.StatusNotFound, "submission not found")
		return
	}

	// get all questions for this assignment with the student's answers
	rows, err := h.db.Query(`
		SELECT q.id, q.question_text, q.explanation, q.display_order,
			ans.selected_choice_id, ans.is_correct
		FROM answers ans
		JOIN questions q ON ans.question_id = q.id
		WHERE ans.submission_id = $1
		ORDER BY q.display_order
	`, submissionID)

	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	type choiceDetail struct {
		Text      string `json:"text"`
		IsCorrect bool   `json:"is_correct"`
		Selected  bool   `json:"selected"`
	}

	type questionDetail struct {
		Number      int            `json:"number"`
		Text        string         `json:"text"`
		Explanation string         `json:"explanation"`
		IsCorrect   bool           `json:"is_correct"`
		Choices     []choiceDetail `json:"choices"`
	}

	var questions []questionDetail

	for rows.Next() {
		var questionID, qText, explanation, selectedChoiceID string
		var displayOrder int
		var isCorrect bool

		if err := rows.Scan(&questionID, &qText, &explanation, &displayOrder, &selectedChoiceID, &isCorrect); err != nil {
			continue
		}

		// simple query using question_id directly
		cRows, err := h.db.Query(`
			SELECT id, choice_text, is_correct
			FROM choices
			WHERE question_id = $1
			ORDER BY display_order
		`, questionID)

		if err != nil {
			questions = append(questions, questionDetail{
				Number:      displayOrder,
				Text:        qText,
				Explanation: explanation,
				IsCorrect:   isCorrect,
				Choices:     []choiceDetail{},
			})
			continue
		}

		var choices []choiceDetail
		for cRows.Next() {
			var cID, cText string
			var cIsCorrect bool
			if err := cRows.Scan(&cID, &cText, &cIsCorrect); err != nil {
				continue
			}
			choices = append(choices, choiceDetail{
				Text:      cText,
				IsCorrect: cIsCorrect,
				Selected:  cID == selectedChoiceID,
			})
		}
		cRows.Close()

		questions = append(questions, questionDetail{
			Number:      displayOrder,
			Text:        qText,
			Explanation: explanation,
			IsCorrect:   isCorrect,
			Choices:     choices,
		})
	}

	percentage := 0
	if totalQuestions > 0 {
		percentage = (score * 100) / totalQuestions
	}

	helpers.JSON(w, http.StatusOK, map[string]interface{}{
		"student_name":    studentName,
		"assignment_title": assignmentTitle,
		"score":           score,
		"total_questions":  totalQuestions,
		"percentage":      percentage,
		"submitted_at":    submittedAt,
		"questions":       questions,
	})
}
