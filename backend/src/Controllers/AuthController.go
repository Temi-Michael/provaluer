package Controllers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"

	"golang.org/x/crypto/bcrypt"
)

func generateVerificationToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

type RegisterRequest struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	Role        string `json:"role"`
}

func RegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		Helpers.JSONError(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	role := "User"
	if req.Role != "" {
		role = req.Role
	}

	tokenStr := generateVerificationToken()

	user := Models.User{
		FullName:          req.FullName,
		Email:             req.Email,
		PhoneNumber:       req.PhoneNumber,
		PasswordHash:      string(hashedPassword),
		Role:              role,
		VerificationToken: tokenStr,
		IsVerified:        false,
	}

	if err := Config.DB.Create(&user).Error; err != nil {
		Helpers.JSONError(w, "Failed to create user (email might exist)", http.StatusConflict)
		return
	}

	// Create default Free Subscription
	subscription := Models.Subscription{
		UserID:       user.ID,
		PlanTier:     "Free",
		MonthlyLimit: Helpers.FreeMonthlyLimit,
		ExpiresAt:    time.Now().AddDate(1, 0, 0), // Default expiry far in future for free tier
	}
	Config.DB.Create(&subscription)

	// Send Welcome Email asynchronously
	go Helpers.SendWelcomeEmail(user.Email, user.FullName, tokenStr)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully. Please check your email to verify your account."})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func LoginUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user Models.User
	if err := Config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		Helpers.JSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if !user.IsVerified {
		Helpers.JSONError(w, "Please verify your email address before logging in.", http.StatusForbidden)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		Helpers.JSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := Helpers.GenerateJWT(user.ID.String(), user.Email, user.Role)
	if err != nil {
		Helpers.JSONError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Login successful",
		"token":   token,
		"user": map[string]interface{}{
			"id":                 user.ID.String(),
			"name":               user.FullName,
			"email":              user.Email,
			"role":               user.Role,
			"portfolio_currency": user.PortfolioCurrency,
			"exchange_rate":      user.ExchangeRate,
		},
	})
}

func VerifyAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		Helpers.JSONError(w, "Missing verification token", http.StatusBadRequest)
		return
	}

	var user Models.User
	if err := Config.DB.Where("verification_token = ?", token).First(&user).Error; err != nil {
		Helpers.JSONError(w, "Invalid or expired verification token", http.StatusBadRequest)
		return
	}

	user.IsVerified = true
	user.VerificationToken = ""
	
	if err := Config.DB.Save(&user).Error; err != nil {
		Helpers.JSONError(w, "Failed to verify account", http.StatusInternalServerError)
		return
	}

	// Redirect back to frontend
	http.Redirect(w, r, "http://localhost:3000/login?verified=true", http.StatusFound)
}
