package Controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
	"provaluer-api/src/Services"
)

type CreateValuationRequest struct {
	ModelType       string                 `json:"model_type"`
	PropertyType    string                 `json:"property_type"`
	State           string                 `json:"state"`
	IsPremium       bool                   `json:"is_premium"`
	LandAreaSqm     float64                `json:"land_area_sqm"`
	BuildingAreaSqm float64                `json:"building_area_sqm"`
	Condition       string                 `json:"condition"`
	Inputs          map[string]interface{} `json:"inputs"`
}

func CreateValuation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	var req CreateValuationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 1. Check Subscription Limit
	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil {
		Helpers.JSONError(w, "Active subscription not found", http.StatusForbidden)
		return
	}

	if sub.ModelsUsedThisMonth >= sub.MonthlyLimit {
		Helpers.JSONError(w, "Monthly limit exceeded. Please upgrade your plan.", http.StatusPaymentRequired)
		return
	}

	// 1.5 Check Feature Gating (Advanced Models)
	// Compare case-insensitively — the client sends a capitalised model type ("Comparable").
	if !strings.EqualFold(req.ModelType, "comparable") && sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your tier to access advanced models", http.StatusForbidden)
		return
	}

	// 2. Create the Property
	property := Models.Property{
		UserID:          sub.UserID,
		Type:            req.PropertyType,
		State:           req.State,
		IsPremium:       req.IsPremium,
		LandAreaSqm:     req.LandAreaSqm,
		BuildingAreaSqm: req.BuildingAreaSqm,
		Condition:       req.Condition,
	}

	if err := Config.DB.Create(&property).Error; err != nil {
		Helpers.JSONError(w, "Failed to create property", http.StatusInternalServerError)
		return
	}

	inputsJSON, _ := json.Marshal(req.Inputs)

	// Perform real value calculation based on selected methodology
	estimatedValue, confidenceScore := computeValuation(
		req.ModelType,
		req.PropertyType,
		req.State,
		req.IsPremium,
		req.LandAreaSqm,
		req.BuildingAreaSqm,
		req.Condition,
		req.Inputs,
	)

	// 4. Create the Valuation Model
	model := Models.ValuationModel{
		UserID:          sub.UserID,
		PropertyID:      property.ID,
		ModelType:       req.ModelType,
		Inputs:          string(inputsJSON),
		EstimatedValue:  estimatedValue,
		ConfidenceScore: confidenceScore,
	}

	if err := Config.DB.Create(&model).Error; err != nil {
		Helpers.JSONError(w, "Failed to create valuation model", http.StatusInternalServerError)
		return
	}

	// 5. Update Subscription Usage
	Config.DB.Model(&sub).Update("models_used_this_month", sub.ModelsUsedThisMonth+1)

	// Return the complete model
	// Preload the property so the frontend has the full data immediately
	var completeModel Models.ValuationModel
	Config.DB.Preload("Property").First(&completeModel, "id = ?", model.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(completeModel)
}

func ExportValuationPDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)
	modelIDStr := strings.TrimPrefix(r.URL.Path, "/api/models/")
	modelIDStr = strings.TrimSuffix(modelIDStr, "/export/pdf")

	var model Models.ValuationModel
	if err := Config.DB.Preload("Property").Preload("User").Where("id = ? AND user_id = ?", modelIDStr, userID).First(&model).Error; err != nil {
		Helpers.JSONError(w, "Model not found", http.StatusNotFound)
		return
	}

	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil || sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your tier to export PDFs", http.StatusForbidden)
		return
	}

	pdfBytes, err := Helpers.GenerateValuationPDF(model, sub)
	if err != nil {
		Helpers.JSONError(w, "Failed to generate PDF", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Provaluer_Report_%s.pdf\"", model.ID.String()[:8]))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	w.Write(pdfBytes)
}

func EmailValuationPDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)
	modelIDStr := strings.TrimPrefix(r.URL.Path, "/api/models/")
	modelIDStr = strings.TrimSuffix(modelIDStr, "/export/email")

	var model Models.ValuationModel
	if err := Config.DB.Preload("Property").Preload("User").Where("id = ? AND user_id = ?", modelIDStr, userID).First(&model).Error; err != nil {
		Helpers.JSONError(w, "Model not found", http.StatusNotFound)
		return
	}

	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil || sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your tier to export PDFs", http.StatusForbidden)
		return
	}

	pdfBytes, err := Helpers.GenerateValuationPDF(model, sub)
	if err != nil {
		Helpers.JSONError(w, "Failed to generate PDF", http.StatusInternalServerError)
		return
	}

	// Send email asynchronously
	go Helpers.SendReportEmail(Helpers.ReportEmail{
		ToEmail:        model.User.Email,
		Name:           model.User.FullName,
		ModelType:      model.ModelType,
		PropertyType:   model.Property.Type,
		State:          model.Property.State,
		EstimatedValue: model.EstimatedValue,
		Confidence:     model.ConfidenceScore,
		PDF:            pdfBytes,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Report is being emailed to you.",
	})
}

// PreviewValuation runs the real valuation engine without persisting anything or
// consuming the user's monthly allowance, so the live preview shown while filling
// in the form is the same number the saved model will produce.
func PreviewValuation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value("user_id").(string)

	var req CreateValuationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Mirror the same tier gate as creation so previewing cannot be used to
	// bypass the paid-model restriction.
	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil {
		Helpers.JSONError(w, "Active subscription not found", http.StatusForbidden)
		return
	}
	if !strings.EqualFold(req.ModelType, "comparable") && sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your tier to access advanced models", http.StatusForbidden)
		return
	}

	value, confidence := computeValuation(
		req.ModelType, req.PropertyType, req.State, req.IsPremium,
		req.LandAreaSqm, req.BuildingAreaSqm, req.Condition, req.Inputs,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"estimated_value":  value,
			"confidence_score": confidence,
		},
	})
}

// GetValuationRates exposes the admin-managed rate configuration that the
// valuation engine uses, so the client-side live preview can mirror the real
// backend calculation instead of duplicating hardcoded rates.
func GetValuationRates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var stateRates []Models.StateRate
	Config.DB.Order("state asc").Find(&stateRates)

	var configs []Models.MaterialCostConfig
	Config.DB.Where("category IN ?", []string{"Build Rates", "Rent Rates"}).Find(&configs)

	rates := make(map[string]float64, len(configs))
	for _, c := range configs {
		rates[c.Key] = c.Value
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"state_rates": stateRates,
			"rates":       rates,
		},
	})
}

// computeValuation delegates to the dynamic valuation engine in Services.
// The engine queries real scraped market comparables and falls back to
// calibrated static rates when live data is insufficient (< 3 records).
func computeValuation(
	modelType string,
	propertyType string,
	state string,
	isPremium bool,
	landArea float64,
	buildingArea float64,
	condition string,
	inputs map[string]interface{},
) (float64, int) {
	return Services.ComputeValuation(
		modelType, propertyType, state, isPremium,
		landArea, buildingArea, condition, inputs,
	)
}
