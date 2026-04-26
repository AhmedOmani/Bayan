package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/AhmedOmani/Bayan/helpers"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const RoleKey contextKey = "role"

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				helpers.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.Split(header, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				helpers.Error(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}

			token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				helpers.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				helpers.Error(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims["user_id"])
			ctx = context.WithValue(ctx, RoleKey, claims["role"])

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func TeacherOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(RoleKey).(string)
		if !ok || role != "teacher" {
			helpers.Error(w, http.StatusForbidden, "teacher access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
