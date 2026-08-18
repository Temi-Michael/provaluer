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

// tierRank orders plans so a change can be classified as an upgrade or a downgrade.
var tierRank = map[string]int{"Free": 0, "Professional": 1, "Enterprise": 2}

// notifySubscriptionChange emails the user a plan-change confirmation. It looks
// the user up by ID and sends in the background, so a mail failure can never
// block or fail the subscription update itself.
func notifySubscriptionChange(userID, newTier, previousTier string, limit int) {
	var user Models.User
	if err := Config.DB.Where("id = ?", userID).First(&user).Error; err != nil || user.Email == "" {
		return
	}

	go Helpers.SendSubscriptionChangeEmail(Helpers.SubscriptionEmail{
		ToEmail:      user.Email,
		Name:         user.FullName,
		PlanTier:     newTier,
		MonthlyLimit: limit,
		Downgrade:    tierRank[newTier] < tierRank[previousTier],
	})
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

	// Capture the previous tier so the confirmation email can tell an upgrade
	// from a downgrade.
	previousTier := ""
	if current, err := Helpers.GetActiveSubscription(userID); err == nil {
		previousTier = current.PlanTier
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

	notifySubscriptionChange(userID, req.PlanTier, previousTier, limit)

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

