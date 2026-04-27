package config

import "os"

type Config struct {
	Port         string
	DatabaseURL  string
	JWTSecret    string
	GoogleAPIKey string
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://bayan:bayan@localhost:5432/bayan?sslmode=disable"),
		JWTSecret:    getEnv("JWT_SECRET", "change-me-in-production"),
		GoogleAPIKey: getEnv("GOOGLE_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
