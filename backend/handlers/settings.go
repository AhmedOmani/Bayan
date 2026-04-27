package handlers

import (
	"net/http"

	"github.com/AhmedOmani/Bayan/helpers"
	"golang.org/x/crypto/bcrypt"
)

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value("user_id").(string)

	var req changePasswordRequest
	if err := helpers.ReadJSON(r, &req); err != nil {
		helpers.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		helpers.Error(w, http.StatusBadRequest, "current and new passwords are required")
		return
	}

	if len(req.NewPassword) < 6 {
		helpers.Error(w, http.StatusBadRequest, "new password must be at least 6 characters")
		return
	}

	// get current password hash
	var currentHash string
	err := h.db.QueryRow("SELECT password_hash FROM teachers WHERE id = $1", teacherID).Scan(&currentHash)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		helpers.Error(w, http.StatusUnauthorized, "كلمة المرور الحالية غير صحيحة")
		return
	}

	// hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// update
	_, err = h.db.Exec("UPDATE teachers SET password_hash = $1 WHERE id = $2", string(newHash), teacherID)
	if err != nil {
		helpers.Error(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	helpers.JSON(w, http.StatusOK, map[string]string{"message": "تم تغيير كلمة المرور بنجاح"})
}
