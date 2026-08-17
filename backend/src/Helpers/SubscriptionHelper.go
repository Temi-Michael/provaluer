package Helpers

import (
	"log"
	"time"

	"github.com/google/uuid"

	"provaluer-api/src/Config"
	"provaluer-api/src/Models"
)

// Monthly valuation-model allowances per plan tier.
// This is the single source of truth — do not hardcode these numbers elsewhere.
const (
	FreeMonthlyLimit         = 5
	ProfessionalMonthlyLimit = 50
	EnterpriseMonthlyLimit   = 150
)

// MonthlyLimitForTier maps a plan tier to its monthly model allowance,
// defaulting to the Free allowance for unknown tiers.
func MonthlyLimitForTier(tier string) int {
	switch tier {
	case "Professional":
		return ProfessionalMonthlyLimit
	case "Enterprise":
		return EnterpriseMonthlyLimit
	default:
		return FreeMonthlyLimit
	}
}

func GetActiveSubscription(userID string) (Models.Subscription, error) {
	var sub Models.Subscription
	
	// Use Find instead of First to prevent GORM's ErrRecordNotFound log spam
	result := Config.DB.Where("user_id = ? AND is_active = ?", userID, true).Find(&sub)
	
	if result.Error != nil {
		return sub, result.Error
	}

	if result.RowsAffected == 0 {
		// User has no active subscription (probably an old test account).
		// Auto-seed a Free subscription to prevent future issues.
		parsedUUID, err := uuid.Parse(userID)
		if err != nil {
			log.Printf("Invalid user ID format: %s\n", userID)
			return sub, err
		}

		sub = Models.Subscription{
			UserID:       parsedUUID,
			PlanTier:     "Free",
			MonthlyLimit: FreeMonthlyLimit,
			ExpiresAt:    time.Now().AddDate(1, 0, 0),
			IsActive:     true,
		}
		
		if err := Config.DB.Create(&sub).Error; err != nil {
			log.Printf("Failed to auto-seed free subscription for user %s: %v\n", userID, err)
			return sub, err
		}
	}

	return sub, nil
}
