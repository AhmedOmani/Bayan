package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/AhmedOmani/Bayan/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) TeacherLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var teacher models.Teacher
	err := h.db.QueryRow(
		"SELECT id, name, email, password_hash FROM teachers WHERE email = $1",
		req.Email,
	).Scan(&teacher.ID, &teacher.Name, &teacher.Email, &teacher.PasswordHash)

	if err == sql.ErrNoRows {
		helpers.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.Password)); err != nil {
		helpers.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.generateToken(teacher.ID, "teacher")
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":    teacher.ID,
			"name":  teacher.Name,
			"email": teacher.Email,
		},
	})
}

func (h *Handler) StudentRegister(w http.ResponseWriter, r *http.Request) {
	var req models.StudentRegisterRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.FullName == "" || req.PhoneNumber == "" || req.Password == "" || req.GradeID == "" {
		helpers.Error(w, http.StatusBadRequest, "all fields are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	var id string
	err = h.db.QueryRow(
		`INSERT INTO students (full_name, phone_number, password_hash, grade_id)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		req.FullName, req.PhoneNumber, string(hash), req.GradeID,
	).Scan(&id)

	if err != nil {
		helpers.Error(w, http.StatusConflict, "student already registered with this name and phone")
		return
	}

	helpers.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "registration submitted, wait for teacher approval",
		"id":      id,
	})
}

func (h *Handler) StudentProfiles(w http.ResponseWriter, r *http.Request) {
	var req models.PhoneRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	rows, err := h.db.Query(
		`SELECT s.id, s.full_name, g.label
		 FROM students s JOIN grades g ON s.grade_id = g.id
		 WHERE s.phone_number = $1 AND s.status != 'BLOCKED'`,
		req.PhoneNumber,
	)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	defer rows.Close()

	var profiles []models.StudentProfile
	for rows.Next() {
		var p models.StudentProfile
		if err := rows.Scan(&p.ID, &p.FullName, &p.Grade); err != nil {
			continue
		}
		profiles = append(profiles, p)
	}

	if len(profiles) == 0 {
		helpers.Error(w, http.StatusNotFound, "no accounts found for this phone number")
		return
	}

	helpers.JSON(w, http.StatusOK, profiles)
}

func (h *Handler) StudentLogin(w http.ResponseWriter, r *http.Request) {
	var req models.StudentLoginRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var student models.Student
	err := h.db.QueryRow(
		"SELECT id, full_name, phone_number, password_hash, grade_id, status FROM students WHERE id = $1",
		req.StudentID,
	).Scan(&student.ID, &student.FullName, &student.PhoneNumber, &student.PasswordHash, &student.GradeID, &student.Status)

	if err == sql.ErrNoRows {
		helpers.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	if student.Status == "PENDING" {
		helpers.Error(w, http.StatusForbidden, "account is pending teacher approval")
		return
	}
	if student.Status == "BLOCKED" {
		helpers.Error(w, http.StatusForbidden, "account is blocked")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(student.PasswordHash), []byte(req.Password)); err != nil {
		helpers.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.generateToken(student.ID, "student")
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":        student.ID,
			"full_name": student.FullName,
			"phone":     student.PhoneNumber,
			"grade_id":  student.GradeID,
			"status":    student.Status,
		},
	})
}

func (h *Handler) generateToken(userID, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
