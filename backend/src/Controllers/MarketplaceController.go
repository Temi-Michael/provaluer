package Controllers

import (
	"encoding/json"
	"net/http"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
)

// GetMarketplaceProperties returns all properties marked "For Sale"
func GetMarketplaceProperties(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var properties []Models.PortfolioProperty
	// Only return properties that are "For Sale"
	if err := Config.DB.Where("status = ?", "For Sale").Order("created_at desc").Find(&properties).Error; err != nil {
		Helpers.JSONError(w, "Failed to fetch marketplace properties", http.StatusInternalServerError)
		return
	}

	// We can sanitize the response if needed here, but since this is an internal marketplace
	// (users must be logged in), returning the core property details is fine.

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(properties)
}
