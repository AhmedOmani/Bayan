package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/AhmedOmani/Bayan/helpers"
)

// google forms API response types
type googleFormResponse struct {
	FormID string           `json:"formId"`
	Info   googleFormInfo   `json:"info"`
	Items  []googleFormItem `json:"items"`
}

type googleFormInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type googleFormItem struct {
	ItemID       string              `json:"itemId"`
	Title        string              `json:"title"`
	Description  string              `json:"description"`
	QuestionItem *googleQuestionItem `json:"questionItem"`
}

type googleQuestionItem struct {
	Question googleQuestion `json:"question"`
}

type googleQuestion struct {
	QuestionID     string               `json:"questionId"`
	Grading        *googleGrading       `json:"grading"`
	ChoiceQuestion *googleChoiceQuestion `json:"choiceQuestion"`
}

type googleChoiceQuestion struct {
	Type    string         `json:"type"`
	Options []googleOption `json:"options"`
}

type googleOption struct {
	Value string `json:"value"`
}

type googleGrading struct {
	PointValue     int                   `json:"pointValue"`
	CorrectAnswers *googleCorrectAnswers `json:"correctAnswers"`
}

type googleCorrectAnswers struct {
	Answers []googleAnswer `json:"answers"`
}

type googleAnswer struct {
	Value string `json:"value"`
}

// import request from frontend
type importFormRequest struct {
	FormURL     string `json:"form_url"`
	AccessToken string `json:"access_token"`
}

// import response to frontend (preview)
type importPreviewResponse struct {
	FormTitle      string                  `json:"form_title"`
	Description    string                  `json:"description"`
	Questions      []importPreviewQuestion `json:"questions"`
	NeedsAnswerKey bool                    `json:"needs_answer_key"`
}

type importPreviewQuestion struct {
	QuestionText string                `json:"question_text"`
	Explanation  string                `json:"explanation"`
	Choices      []importPreviewChoice `json:"choices"`
}

type importPreviewChoice struct {
	ChoiceText string `json:"choice_text"`
	IsCorrect  bool   `json:"is_correct"`
}

// detect URL type
type formURLType int

const (
	urlTypeUnknown  formURLType = iota
	urlTypeEdit                         // /forms/d/FORM_ID/edit — API accessible
	urlTypeResponse                     // /forms/d/e/FORM_ID/viewform — public page
)

func classifyFormURL(rawURL string) (formURLType, string) {
	rawURL = strings.TrimSpace(rawURL)

	// handle forms.gle short links by following redirect
	if strings.Contains(rawURL, "forms.gle") {
		client := &http.Client{
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
		resp, err := client.Get(rawURL)
		if err == nil {
			defer resp.Body.Close()
			loc := resp.Header.Get("Location")
			if loc != "" {
				rawURL = loc
			}
		}
	}

	// check for /d/e/ URL (published response URL — scrape approach)
	rePublished := regexp.MustCompile(`/forms/d/e/([a-zA-Z0-9_-]+)`)
	if matches := rePublished.FindStringSubmatch(rawURL); len(matches) > 1 {
		return urlTypeResponse, rawURL
	}

	// check for /d/FORM_ID URL (edit URL — API approach)
	reEdit := regexp.MustCompile(`/forms/d/([a-zA-Z0-9_-]+)`)
	if matches := reEdit.FindStringSubmatch(rawURL); len(matches) > 1 {
		return urlTypeEdit, matches[1]
	}

	// raw ID
	if !strings.Contains(rawURL, "/") && len(rawURL) > 10 {
		return urlTypeEdit, rawURL
	}

	return urlTypeUnknown, ""
}

// scrapePublicForm extracts questions from a public Google Form HTML page
func scrapePublicForm(formURL string) (*importPreviewResponse, error) {
	// fetch the public form page
	resp, err := http.Get(formURL)
	if err != nil {
		return nil, fmt.Errorf("failed to reach Google Forms page")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read form page")
	}

	html := string(body)

	// extract FB_PUBLIC_LOAD_DATA_ from page source
	marker := "FB_PUBLIC_LOAD_DATA_ = "
	idx := strings.Index(html, marker)
	if idx == -1 {
		return nil, fmt.Errorf("لا يمكن قراءة بيانات النموذج — تأكد أن النموذج عام")
	}

	// extract JSON data between the marker and the closing semicolon
	dataStart := idx + len(marker)
	rest := html[dataStart:]
	endIdx := strings.Index(rest, ";\n")
	if endIdx == -1 {
		endIdx = strings.Index(rest, ";")
	}
	if endIdx == -1 {
		return nil, fmt.Errorf("failed to parse form data structure")
	}

	rawJSON := rest[:endIdx]

	// parse as generic JSON array
	var data []interface{}
	if err := json.Unmarshal([]byte(rawJSON), &data); err != nil {
		return nil, fmt.Errorf("failed to parse form data JSON")
	}

	// extract title from data[1][8] (form title) or data[3]
	title := "نموذج مستورد"
	if len(data) > 1 {
		if d1, ok := data[1].([]interface{}); ok {
			// d1[8] is usually the form title
			if len(d1) > 8 {
				if t, ok := d1[8].(string); ok && t != "" {
					title = t
				}
			}
		}
	}
	// fallback: data[3]
	if title == "نموذج مستورد" && len(data) > 3 {
		if t, ok := data[3].(string); ok && t != "" {
			title = t
		}
	}

	// extract questions from data[1][1]
	questions := []importPreviewQuestion{}

	if len(data) > 1 {
		d1, ok := data[1].([]interface{})
		if !ok || len(d1) < 2 {
			return nil, fmt.Errorf("unexpected form data structure")
		}

		// d1[0] = description string, d1[1] = items array
		var items []interface{}
		// items can be at d1[1] as an array of question items
		if d1Items, ok := d1[1].([]interface{}); ok {
			items = d1Items
		} else {
			return nil, fmt.Errorf("unexpected form items structure")
		}

		for _, item := range items {
			itemArr, ok := item.([]interface{})
			if !ok || len(itemArr) < 5 {
				continue
			}

			// itemArr[1] = question title
			qTitle := ""
			if t, ok := itemArr[1].(string); ok {
				qTitle = t
			}
			if qTitle == "" {
				continue
			}

			// itemArr[3] = question type (2=radio, 3=dropdown, 4=checkbox)
			qType := float64(-1)
			if t, ok := itemArr[3].(float64); ok {
				qType = t
			}
			if qType != 2 && qType != 3 && qType != 4 {
				continue
			}

			// itemArr[4] = array of choice groups
			// itemArr[4][0] = first choice group
			// itemArr[4][0][1] = array of choices
			qGroups, ok := itemArr[4].([]interface{})
			if !ok || len(qGroups) == 0 {
				continue
			}

			firstGroup, ok := qGroups[0].([]interface{})
			if !ok || len(firstGroup) < 2 {
				continue
			}

			choicesRaw, ok := firstGroup[1].([]interface{})
			if !ok || len(choicesRaw) < 2 {
				continue
			}

			choices := []importPreviewChoice{}
			for _, cRaw := range choicesRaw {
				cArr, ok := cRaw.([]interface{})
				if !ok || len(cArr) == 0 {
					continue
				}
				choiceText := ""
				if t, ok := cArr[0].(string); ok {
					choiceText = t
				}
				if choiceText == "" {
					continue
				}
				choices = append(choices, importPreviewChoice{
					ChoiceText: choiceText,
					IsCorrect:  false,
				})
			}

			if len(choices) < 2 {
				continue
			}

			// set first choice as default correct (teacher will adjust)
			choices[0].IsCorrect = true

			questions = append(questions, importPreviewQuestion{
				QuestionText: qTitle,
				Explanation:  "",
				Choices:      choices,
			})
		}
	}

	if len(questions) == 0 {
		return nil, fmt.Errorf("لا توجد أسئلة اختيار من متعدد في هذا النموذج")
	}

	return &importPreviewResponse{
		FormTitle:      title,
		Description:    "",
		Questions:      questions,
		NeedsAnswerKey: true,
	}, nil
}

// fetchViaAPI uses Google Forms API with OAuth token
func fetchViaAPI(formID, accessToken string) (*importPreviewResponse, error) {
	apiURL := fmt.Sprintf("https://forms.googleapis.com/v1/forms/%s", formID)
	apiReq, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request")
	}
	apiReq.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to reach Google Forms API")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read API response")
	}

	if resp.StatusCode != 200 {
		if resp.StatusCode == 404 {
			return nil, fmt.Errorf("النموذج غير موجود — تأكد من الرابط")
		}
		if resp.StatusCode == 403 || resp.StatusCode == 401 {
			return nil, fmt.Errorf("لا يمكن الوصول — تأكد أن لديك صلاحية لعرض النموذج")
		}
		return nil, fmt.Errorf("Google API error: %d", resp.StatusCode)
	}

	var form googleFormResponse
	if err := json.Unmarshal(body, &form); err != nil {
		return nil, fmt.Errorf("failed to parse API response")
	}

	preview := importPreviewResponse{
		FormTitle:      form.Info.Title,
		Description:    form.Info.Description,
		Questions:      []importPreviewQuestion{},
		NeedsAnswerKey: false,
	}

	for _, item := range form.Items {
		if item.QuestionItem == nil {
			continue
		}
		q := item.QuestionItem.Question
		if q.ChoiceQuestion == nil {
			continue
		}
		choices := []importPreviewChoice{}
		for _, opt := range q.ChoiceQuestion.Options {
			if opt.Value == "" {
				continue
			}
			isCorrect := false
			if q.Grading != nil && q.Grading.CorrectAnswers != nil {
				for _, ans := range q.Grading.CorrectAnswers.Answers {
					if ans.Value == opt.Value {
						isCorrect = true
						break
					}
				}
			}
			choices = append(choices, importPreviewChoice{
				ChoiceText: opt.Value,
				IsCorrect:  isCorrect,
			})
		}
		if len(choices) < 2 {
			continue
		}
		preview.Questions = append(preview.Questions, importPreviewQuestion{
			QuestionText: item.Title,
			Explanation:  item.Description,
			Choices:      choices,
		})
	}

	if len(preview.Questions) == 0 {
		return nil, fmt.Errorf("لا توجد أسئلة اختيار من متعدد في هذا النموذج")
	}

	return &preview, nil
}

func (h *Handler) ImportGoogleForm(w http.ResponseWriter, r *http.Request) {
	var req importFormRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.FormURL == "" {
		helpers.Error(w, http.StatusBadRequest, "form_url is required")
		return
	}

	urlType, value := classifyFormURL(req.FormURL)

	var preview *importPreviewResponse
	var fetchErr error

	switch urlType {
	case urlTypeResponse:
		// public form — scrape HTML (no OAuth needed)
		preview, fetchErr = scrapePublicForm(value)

	case urlTypeEdit:
		// edit URL — use Google Forms API with OAuth
		if req.AccessToken == "" {
			helpers.Error(w, http.StatusBadRequest, "access_token is required — sign in with Google first")
			return
		}
		preview, fetchErr = fetchViaAPI(value, req.AccessToken)

	default:
		helpers.Error(w, http.StatusBadRequest, "لم يتم التعرف على الرابط — استخدم رابط Google Forms")
		return
	}

	if fetchErr != nil {
		helpers.Error(w, http.StatusBadGateway, fetchErr.Error())
		return
	}

	helpers.JSON(w, http.StatusOK, preview)
}
