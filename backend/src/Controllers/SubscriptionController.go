package Controllers

import (
	"encoding/json"
	"net/http"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
	"time"
)

// GetMySubscription returns the user's active subscription
func GetMySubscription(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	subscription, err := Helpers.GetActiveSubscription(userID)
	if err != nil {
		Helpers.JSONError(w, "No active subscription found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subscription)
}

type UpgradeRequest struct {
	PlanTier string `json:"plan_tier"`
}

// UpgradeSubscription upgrades the user's subscription tier
func UpgradeSubscription(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	var req UpgradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate PlanTier
	limit := Helpers.MonthlyLimitForTier("Free")
	if req.PlanTier == "Professional" || req.PlanTier == "Enterprise" {
		limit = Helpers.MonthlyLimitForTier(req.PlanTier)
	} else {
		req.PlanTier = "Free"
	}

	// Update existing subscription
	if err := Config.DB.Model(&Models.Subscription{}).Where("user_id = ? AND is_active = ?", userID, true).Updates(map[string]interface{}{
		"plan_tier":     req.PlanTier,
		"monthly_limit": limit,
		"updated_at":    time.Now(),
	}).Error; err != nil {
		Helpers.JSONError(w, "Failed to upgrade subscription", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Subscription upgraded successfully",
		"tier":    req.PlanTier,
	})
}

type EnterpriseSettingsRequest struct {
	CustomAgencyName string `json:"custom_agency_name"`
	CustomBrandColor string `json:"custom_brand_color"`
	CustomLogo       string `json:"custom_logo"`
	CustomFont       string `json:"custom_font"`
}

func UpdateEnterpriseSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil || sub.PlanTier != "Enterprise" {
		Helpers.JSONError(w, "Only Enterprise accounts can update these settings", http.StatusForbidden)
		return
	}

	var req EnterpriseSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := Config.DB.Model(&Models.Subscription{}).Where("id = ?", sub.ID).Updates(map[string]interface{}{
		"custom_agency_name": req.CustomAgencyName,
		"custom_brand_color": req.CustomBrandColor,
		"custom_logo":        req.CustomLogo,
		"custom_font":        req.CustomFont,
		"updated_at":         time.Now(),
	}).Error; err != nil {
		Helpers.JSONError(w, "Failed to update settings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Enterprise settings updated successfully",
	})
}

