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
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

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
			var tokenStr string

			// check cookies first (teacher then student)
			if c, err := r.Cookie("bayan_teacher"); err == nil {
				tokenStr = c.Value
			} else if c, err := r.Cookie("bayan_student"); err == nil {
				tokenStr = c.Value
			}

			// fallback to Authorization header
			if tokenStr == "" {
				header := r.Header.Get("Authorization")
				if header != "" {
					parts := strings.Split(header, " ")
					if len(parts) == 2 && parts[0] == "Bearer" {
						tokenStr = parts[1]
					}
				}
			}

			if tokenStr == "" {
				helpers.Error(w, http.StatusUnauthorized, "not authenticated")
				return
			}

			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
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
