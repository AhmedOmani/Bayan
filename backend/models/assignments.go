package models

// request for creating an assignment with nested questions + choices
type CreateAssignmentRequest struct {
	Title       string                   `json:"title"`
	Description string                   `json:"description"`
	GradeID     string                   `json:"grade_id"`
	Deadline    string                   `json:"deadline"`
	Questions   []CreateQuestionRequest  `json:"questions"`
}

type CreateQuestionRequest struct {
	QuestionText string                `json:"question_text"`
	Explanation  string                `json:"explanation"`
	Choices      []CreateChoiceRequest `json:"choices"`
}

type CreateChoiceRequest struct {
	ChoiceText string `json:"choice_text"`
	IsCorrect  bool   `json:"is_correct"`
}

// response for assignment list items
type AssignmentListItem struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	GradeID        string `json:"grade_id"`
	GradeLabel     string `json:"grade_label"`
	Deadline       string `json:"deadline"`
	IsPublished    bool   `json:"is_published"`
	QuestionCount  int    `json:"question_count"`
	SubmissionCount int   `json:"submission_count"`
	CreatedAt      string `json:"created_at"`
}

// student view of an assignment
type StudentAssignmentItem struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Deadline      string `json:"deadline"`
	QuestionCount int    `json:"question_count"`
	Submitted     bool   `json:"submitted"`
}
