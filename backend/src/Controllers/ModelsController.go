package Controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
)

// GetMyModels returns all valuation models created by the user
func GetMyModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)
	modelType := r.URL.Query().Get("type")

	var valuationModels []Models.ValuationModel
	
	query := Config.DB.Preload("Property").Where("user_id = ?", userID)
	if modelType != "" && modelType != "all" {
		// e.g. ?type=comparable
		query = query.Where("model_type ILIKE ?", modelType)
	}

	if err := query.Order("created_at desc").Find(&valuationModels).Error; err != nil {
		Helpers.JSONError(w, "Failed to fetch models", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(valuationModels)
}

// GetModelByID returns a single model by its ID, enforcing ownership
func GetModelByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)
	
	// Example path: /api/models/123
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 || pathParts[3] == "" {
		Helpers.JSONError(w, "Invalid model ID", http.StatusBadRequest)
		return
	}
	modelID := pathParts[3]

	var model Models.ValuationModel
	if err := Config.DB.Preload("Property").Where("id = ? AND user_id = ?", modelID, userID).First(&model).Error; err != nil {
		Helpers.JSONError(w, "Model not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(model)
}
