package handlers

import "database/sql"

type Handler struct {
	db        *sql.DB
	jwtSecret string
}

func New(db *sql.DB, jwtSecret string) *Handler {
	return &Handler{
		db:        db,
		jwtSecret: jwtSecret,
	}
}
