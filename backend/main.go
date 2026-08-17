package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"provaluer-api/src/Config"
	"provaluer-api/src/Controllers"
	"provaluer-api/src/Middleware"
	"provaluer-api/src/Routes"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Enforce presence of required secrets to prevent fallback vulnerability
	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is not set")
	}
	if os.Getenv("AES_SECRET_KEY") == "" {
		log.Fatal("FATAL: AES_SECRET_KEY environment variable is not set")
	}

	// Initialize Database
	Config.ConnectDB()

	// Start Background Scheduled Tasks
	Controllers.StartCronJobs()

	// Setup basic router
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "message": "Provaluer API is running"}`))
	})

	// Register App Routes
	Routes.RegisterRoutes(mux)

	// Setup CORS — ALLOWED_ORIGINS is a comma-separated list of deployed frontend
	// origins (e.g. "https://provaluer.vercel.app"). Defaults to local dev.
	allowedOrigins := []string{"http://localhost:3000"}
	if raw := os.Getenv("ALLOWED_ORIGINS"); raw != "" {
		allowedOrigins = nil
		for _, o := range strings.Split(raw, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}
	log.Printf("CORS allowed origins: %v", allowedOrigins)

	c := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	})
	handler := c.Handler(mux)

	// Wrap handler in IP rate limiter middleware
	rateLimitedHandler := Middleware.RateLimit(handler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, rateLimitedHandler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
