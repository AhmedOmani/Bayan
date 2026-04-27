package handlers

import "database/sql"

type Handler struct {
	db           *sql.DB
	jwtSecret    string
	googleAPIKey string
}

func New(db *sql.DB, jwtSecret string, googleAPIKey string) *Handler {
	return &Handler{
		db:           db,
		jwtSecret:    jwtSecret,
		googleAPIKey: googleAPIKey,
	}
}
