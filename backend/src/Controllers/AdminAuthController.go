package Controllers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
)

// AdminResponse Envelope
type AdminResponse struct {
	Success   bool        `json:"success"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
}

func JSONAdminResponse(w http.ResponseWriter, status int, data interface{}, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(AdminResponse{
		Success:   status >= 200 && status < 300,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data:      data,
		Error:     errMsg,
	})
}

// Generate secure random hex token
func generateSecureToken() (string, string) {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	token := hex.EncodeToString(bytes)
	
	// Hash the token for DB storage
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])
	
	return token, tokenHash
}

func AdminLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	var req LoginRequest // Re-use from AuthController
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JSONAdminResponse(w, http.StatusBadRequest, nil, "Invalid request body")
		return
	}

	var admin Models.AdminUser
	if err := Config.DB.Where("email = ? AND is_active = ?", req.Email, true).First(&admin).Error; err != nil {
		JSONAdminResponse(w, http.StatusUnauthorized, nil, "Invalid credentials")
		return
	}

	if !Helpers.ComparePasswordArgon2(req.Password, admin.PasswordHash) {
		JSONAdminResponse(w, http.StatusUnauthorized, nil, "Invalid credentials")
		return
	}

	// Create Session
	token, tokenHash := generateSecureToken()
	
	session := Models.AdminSession{
		AdminID:   admin.ID,
		TokenHash: tokenHash,
		UserAgent: r.UserAgent(),
		IPAddress: r.RemoteAddr,
		ExpiresAt: time.Now().Add(1 * time.Hour), // 1-hour strict expiry
	}

	if err := Config.DB.Create(&session).Error; err != nil {
		JSONAdminResponse(w, http.StatusInternalServerError, nil, "Failed to create session")
		return
	}

	// Update Last Login IP
	Config.DB.Model(&admin).Update("last_login_ip", r.RemoteAddr)

	JSONAdminResponse(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"admin": map[string]interface{}{
			"id":    admin.ID.String(),
			"name":  admin.FullName,
			"email": admin.Email,
			"role":  admin.Role,
		},
	}, "")
}

func AdminLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	// Middleware will place session_id in context
	sessionID := r.Context().Value("admin_session_id")
	if sessionID != nil {
		Config.DB.Where("id = ?", sessionID).Delete(&Models.AdminSession{})
	}

	JSONAdminResponse(w, http.StatusOK, map[string]string{"message": "Logged out successfully"}, "")
}
