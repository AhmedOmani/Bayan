package models

import "time"

type Teacher struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Grade struct {
	ID           string    `json:"id"`
	Label        string    `json:"label"`
	NumericValue int       `json:"numeric_value"`
	AcademicYear string    `json:"academic_year"`
	CreatedAt    time.Time `json:"created_at"`
}

type Student struct {
	ID           string    `json:"id"`
	FullName     string    `json:"full_name"`
	PhoneNumber  string    `json:"phone_number"`
	PasswordHash string    `json:"-"`
	GradeID      string    `json:"grade_id"`
	Status       string    `json:"status"`
	RegisteredAt time.Time `json:"registered_at"`
}

type Assignment struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	GradeID     string     `json:"grade_id"`
	Deadline    time.Time  `json:"deadline"`
	IsPublished bool       `json:"is_published"`
	CreatedAt   time.Time  `json:"created_at"`
	Questions   []Question `json:"questions,omitempty"`
}

type Question struct {
	ID           string   `json:"id"`
	AssignmentID string   `json:"assignment_id"`
	QuestionText string   `json:"question_text"`
	Explanation  string   `json:"explanation"`
	DisplayOrder int      `json:"display_order"`
	MediaURL     string   `json:"media_url,omitempty"`
	Choices      []Choice `json:"choices,omitempty"`
}

type Choice struct {
	ID           string `json:"id"`
	QuestionID   string `json:"question_id"`
	ChoiceText   string `json:"choice_text"`
	IsCorrect    bool   `json:"is_correct"`
	DisplayOrder int    `json:"display_order"`
}

type Submission struct {
	ID             string    `json:"id"`
	StudentID      string    `json:"student_id"`
	AssignmentID   string    `json:"assignment_id"`
	Score          int       `json:"score"`
	TotalQuestions int       `json:"total_questions"`
	SubmittedAt    time.Time `json:"submitted_at"`
	Answers        []Answer  `json:"answers,omitempty"`
}

type Answer struct {
	ID               string `json:"id"`
	SubmissionID     string `json:"submission_id"`
	QuestionID       string `json:"question_id"`
	SelectedChoiceID string `json:"selected_choice_id"`
	IsCorrect        bool   `json:"is_correct"`
}

// request types

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type StudentRegisterRequest struct {
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	GradeID     string `json:"grade_id"`
}

type StudentLoginRequest struct {
	StudentID string `json:"student_id"`
	Password  string `json:"password"`
}

type PhoneRequest struct {
	PhoneNumber string `json:"phone_number"`
}

type StudentProfile struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Grade    string `json:"grade"`
}

type CreateGradeRequest struct {
	Label        string `json:"label"`
	NumericValue int    `json:"numeric_value"`
	AcademicYear string `json:"academic_year"`
}
