package Controllers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// verificationTokenTTL is how long a verification link stays valid.
// Accounts left unverified past this window are removed by CleanupUnverifiedAccounts.
const verificationTokenTTL = 48 * time.Hour

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
		FullName:                 req.FullName,
		Email:                    req.Email,
		PhoneNumber:              req.PhoneNumber,
		PasswordHash:             string(hashedPassword),
		Role:                     role,
		VerificationToken:        tokenStr,
		VerificationTokenExpires: time.Now().Add(verificationTokenTTL),
		IsVerified:               false,
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
		Helpers.JSONError(w, "Please verify your email address before logging in. Check your inbox or request a new verification link.", http.StatusForbidden)
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

	// Reject expired links and bounce the user to a page where they can resend.
	if time.Now().After(user.VerificationTokenExpires) {
		http.Redirect(w, r, Helpers.AppBaseURL()+"/login?verified=expired", http.StatusFound)
		return
	}

	user.IsVerified = true
	user.VerificationToken = ""

	if err := Config.DB.Save(&user).Error; err != nil {
		Helpers.JSONError(w, "Failed to verify account", http.StatusInternalServerError)
		return
	}

	// Redirect back to frontend
	http.Redirect(w, r, Helpers.AppBaseURL()+"/login?verified=true", http.StatusFound)
}

// ResendVerification issues a fresh token + expiry and re-sends the verification
// email. Always returns the same success message so it can't be used to probe
// which emails are registered.
func ResendVerification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	const genericMsg = "If an unverified account exists for that email, a new verification link has been sent."

	var user Models.User
	if err := Config.DB.Where("email = ? AND is_verified = ?", req.Email, false).First(&user).Error; err == nil {
		user.VerificationToken = generateVerificationToken()
		user.VerificationTokenExpires = time.Now().Add(verificationTokenTTL)
		if err := Config.DB.Save(&user).Error; err == nil {
			go Helpers.SendWelcomeEmail(user.Email, user.FullName, user.VerificationToken)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": genericMsg})
}

// CleanupUnverifiedAccounts deletes accounts that were never verified before
// their token expired, freeing the email address for re-registration. It also
// removes the Free subscription auto-created at signup to avoid orphan rows.
//
// Staleness is measured from created_at (always populated) rather than the
// token-expiry column, so rows written before that column existed — whose
// expiry defaults to the zero time — are not swept prematurely.
func CleanupUnverifiedAccounts() {
	cutoff := time.Now().Add(-verificationTokenTTL)

	var stale []Models.User
	if err := Config.DB.Where("is_verified = ? AND created_at < ?", false, cutoff).Find(&stale).Error; err != nil {
		log.Printf("[Cleanup] Failed to query unverified accounts: %v", err)
		return
	}
	if len(stale) == 0 {
		return
	}

	ids := make([]uuid.UUID, 0, len(stale))
	for _, u := range stale {
		ids = append(ids, u.ID)
	}

	err := Config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id IN ?", ids).Delete(&Models.Subscription{}).Error; err != nil {
			return err
		}
		return tx.Where("id IN ?", ids).Delete(&Models.User{}).Error
	})
	if err != nil {
		log.Printf("[Cleanup] Failed to delete %d unverified accounts: %v", len(ids), err)
		return
	}
	log.Printf("[Cleanup] Removed %d expired unverified account(s)", len(ids))
}
