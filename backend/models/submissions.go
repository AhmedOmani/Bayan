package models

// request for submitting answers
type SubmitRequest struct {
	Answers []SubmitAnswer `json:"answers"`
}

type SubmitAnswer struct {
	QuestionID string `json:"question_id"`
	ChoiceID   string `json:"choice_id"`
}

// response after submission
type SubmitResult struct {
	ID             string               `json:"id"`
	Score          int                  `json:"score"`
	TotalQuestions int                  `json:"total_questions"`
	Percentage     int                  `json:"percentage"`
	Details        []SubmitAnswerDetail `json:"details"`
}

type SubmitAnswerDetail struct {
	QuestionText    string `json:"question_text"`
	Explanation     string `json:"explanation"`
	SelectedChoice  string `json:"selected_choice"`
	CorrectChoice   string `json:"correct_choice"`
	IsCorrect       bool   `json:"is_correct"`
}

// teacher view of submissions list
type SubmissionListItem struct {
	ID             string `json:"id"`
	StudentName    string `json:"student_name"`
	Score          int    `json:"score"`
	TotalQuestions int    `json:"total_questions"`
	Percentage     int    `json:"percentage"`
	SubmittedAt    string `json:"submitted_at"`
}
