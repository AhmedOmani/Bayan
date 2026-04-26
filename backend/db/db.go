package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func Connect(databaseURL string) (*sql.DB, error) {
	conn, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(); err != nil {
		return nil, err
	}

	return conn, nil
}

func RunMigrations(conn *sql.DB) error {
	data, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		return err
	}

	_, err = conn.Exec(string(data))
	if err != nil {
		log.Printf("migration note: %v", err)
	}

	return nil
}
