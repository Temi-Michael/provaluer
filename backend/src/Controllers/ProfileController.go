package Controllers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"

	"gorm.io/gorm"
)

func GenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	sub, err := Helpers.GetActiveSubscription(userID)
	if err == nil {
		if sub.PlanTier == "Starter" || sub.PlanTier == "Free" {
			Helpers.JSONError(w, "API Key generation is not available on your current plan. Please upgrade to Pro or Enterprise.", http.StatusForbidden)
			return
		}
	}

	// Generate 32 secure random bytes
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		Helpers.JSONError(w, "Failed to generate random bytes", http.StatusInternalServerError)
		return
	}

	// Base64 URL encode without padding
	randomString := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b)
	
	// Construct the raw API Key
	rawAPIKey := fmt.Sprintf("pro_live_%s_%s", userID, randomString)

	// Hash the key using SHA-256 for secure storage
	hash := sha256.Sum256([]byte(rawAPIKey))
	hashedKeyHex := fmt.Sprintf("%x", hash)

	// Update the user's ApiKeyToken in the database
	if err := Config.DB.Model(&Models.User{}).Where("id = ?", userID).Update("api_key_token", hashedKeyHex).Error; err != nil {
		Helpers.JSONError(w, "Failed to update API key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// We return the raw API Key ONCE. It is never retrievable again.
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "API Key generated successfully. Please copy it now. It will not be shown again.",
		"api_key": rawAPIKey,
	})
}

type UpdatePreferencesRequest struct {
	PortfolioCurrency string  `json:"portfolio_currency"`
	ExchangeRate      float64 `json:"exchange_rate"`
}

func UpdateProfilePreferences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	var req UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PortfolioCurrency == "" {
		req.PortfolioCurrency = "NGN"
	}
	if req.ExchangeRate <= 0 {
		req.ExchangeRate = 1400.0 // fallback default
	}

	// Update the user's preferences in the database
	if err := Config.DB.Model(&Models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"portfolio_currency": req.PortfolioCurrency,
		"exchange_rate":      req.ExchangeRate,
	}).Error; err != nil {
		Helpers.JSONError(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":            "Preferences updated successfully",
		"portfolio_currency": req.PortfolioCurrency,
		"exchange_rate":      req.ExchangeRate,
	})
}

func DeleteAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	// Since GORM cascade updates can be finicky on existing DBs, we'll manually wipe the dependencies in a transaction
	err := Config.DB.Transaction(func(tx *gorm.DB) error {
		// Portfolio Dependencies
		if err := tx.Exec("DELETE FROM maintenance_logs WHERE property_id IN (SELECT id FROM portfolio_properties WHERE user_id = ?)", userID).Error; err != nil { return err }
		if err := tx.Exec("DELETE FROM transactions WHERE property_id IN (SELECT id FROM portfolio_properties WHERE user_id = ?)", userID).Error; err != nil { return err }
		if err := tx.Exec("DELETE FROM leases WHERE property_id IN (SELECT id FROM portfolio_properties WHERE user_id = ?)", userID).Error; err != nil { return err }
		if err := tx.Exec("DELETE FROM tenants WHERE user_id = ?", userID).Error; err != nil { return err }
		if err := tx.Exec("DELETE FROM portfolio_properties WHERE user_id = ?", userID).Error; err != nil { return err }

		// Valuation Dependencies
		if err := tx.Exec("DELETE FROM valuation_models WHERE user_id = ?", userID).Error; err != nil { return err }
		if err := tx.Exec("DELETE FROM properties WHERE user_id = ?", userID).Error; err != nil { return err }

		// User Dependencies
		if err := tx.Exec("DELETE FROM subscriptions WHERE user_id = ?", userID).Error; err != nil { return err }

		// Finally, delete the user (Hard Delete to ensure all CASCADE and unique constraints are fully cleared, allowing re-registration)
		return tx.Unscoped().Where("id = ?", userID).Delete(&Models.User{}).Error
	})

	if err != nil {
		Helpers.JSONError(w, "Failed to delete account", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Account deleted successfully",
	})
}
