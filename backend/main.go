package main

import (
	"log"
	"net/http"

	"github.com/AhmedOmani/Bayan/config"
	"github.com/AhmedOmani/Bayan/db"
	"github.com/AhmedOmani/Bayan/handlers"
	"github.com/AhmedOmani/Bayan/middleware"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to connect to database: ", err)
	}
	defer database.Close()

	if err := db.RunMigrations(database); err != nil {
		log.Fatal("failed to run migrations: ", err)
	}

	// seed default teacher on first run
	var count int
	database.QueryRow("SELECT COUNT(*) FROM teachers").Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 12)
		database.Exec(
			"INSERT INTO teachers (name, email, password_hash) VALUES ($1, $2, $3)",
			"المعلم", "admin@bayan.com", string(hash),
		)
		log.Println("default teacher created - email: admin@bayan.com, password: admin123")
	}

	h := handlers.New(database, cfg.JWTSecret)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS)

	// public routes
	r.Post("/api/auth/teacher/login", h.TeacherLogin)
	r.Post("/api/auth/teacher/logout", h.TeacherLogout)
	r.Post("/api/auth/student/register", h.StudentRegister)
	r.Post("/api/auth/student/profiles", h.StudentProfiles)
	r.Post("/api/auth/student/login", h.StudentLogin)
	r.Post("/api/auth/student/logout", h.StudentLogout)
	r.Get("/api/grades", h.ListGrades)
	r.Get("/api/health", h.HealthCheck)

	// teacher-only routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(cfg.JWTSecret))
		r.Use(middleware.TeacherOnly)

		r.Post("/api/grades", h.CreateGrade)
		r.Delete("/api/grades/{id}", h.DeleteGrade)

		r.Get("/api/students", h.ListStudents)
		r.Patch("/api/students/{id}/approve", h.ApproveStudent)
		r.Patch("/api/students/{id}/block", h.BlockStudent)
		r.Patch("/api/students/{id}/grade", h.ChangeStudentGrade)

		r.Post("/api/assignments", h.CreateAssignment)
		r.Post("/api/assignments/{id}/publish", h.PublishAssignment)
	})

	// authenticated routes (teacher or student)
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(cfg.JWTSecret))

		r.Get("/api/assignments", h.ListAssignments)
		r.Get("/api/assignments/{id}", h.GetAssignment)
		r.Post("/api/assignments/{id}/submit", h.SubmitAssignment)
		r.Get("/api/assignments/{id}/submissions", h.ListSubmissions)
		r.Get("/api/submissions/{submissionId}", h.GetSubmission)
	})

	log.Printf("bayan server running on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
