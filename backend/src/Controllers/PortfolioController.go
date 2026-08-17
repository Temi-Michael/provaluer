package Controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
	"provaluer-api/src/Services"
)

// AddPortfolioProperty adds a new property to the CRM
func AddPortfolioProperty(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		Helpers.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		Helpers.JSONError(w, "Invalid user ID", http.StatusUnauthorized)
		return
	}

	var req Models.PortfolioProperty
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.UserID = userID

	if err := Config.DB.Create(&req).Error; err != nil {
		Helpers.JSONError(w, "Failed to create property", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// GetPortfolioProperties returns all properties for the user
func GetPortfolioProperties(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		Helpers.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var properties []Models.PortfolioProperty
	if err := Config.DB.Where("user_id = ?", userIDStr).Order("created_at desc").Find(&properties).Error; err != nil {
		Helpers.JSONError(w, "Failed to fetch properties", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(properties)
}

// AddTransaction logs income or expenses (Ledger)
func AddTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req Models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := Config.DB.Create(&req).Error; err != nil {
		Helpers.JSONError(w, "Failed to log transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// GetTransactions gets ledger history for a property
func GetTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	propertyID := r.URL.Query().Get("property_id")
	if propertyID == "" {
		Helpers.JSONError(w, "property_id query parameter required", http.StatusBadRequest)
		return
	}

	var transactions []Models.Transaction
	if err := Config.DB.Where("property_id = ?", propertyID).Order("date desc").Find(&transactions).Error; err != nil {
		Helpers.JSONError(w, "Failed to fetch transactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

// GetPropertyDetails gets property + leases + tenants
func GetPropertyDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	propertyIDStr := strings.TrimPrefix(r.URL.Path, "/api/portfolio/")
	userIDStr := r.Context().Value("user_id").(string)

	var property Models.PortfolioProperty
	if err := Config.DB.Where("id = ? AND user_id = ?", propertyIDStr, userIDStr).First(&property).Error; err != nil {
		Helpers.JSONError(w, "Property not found", http.StatusNotFound)
		return
	}

	var leases []Models.Lease
	Config.DB.Preload("Tenant").Where("property_id = ?", propertyIDStr).Find(&leases)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"property": property,
		"leases":   leases,
	})
}

// RunPortfolioValuation runs the valuation engine against a portfolio property,
// saves a ValuationModel, and updates the property's current_value.
func RunPortfolioValuation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr := r.Context().Value("user_id").(string)

	var req struct {
		PropertyID string                 `json:"property_id"`
		ModelType  string                 `json:"model_type"`
		IsPremium  bool                   `json:"is_premium"`
		Inputs     map[string]interface{} `json:"inputs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var pp Models.PortfolioProperty
	if err := Config.DB.Where("id = ? AND user_id = ?", req.PropertyID, userIDStr).First(&pp).Error; err != nil {
		Helpers.JSONError(w, "Property not found", http.StatusNotFound)
		return
	}

	sub, err := Helpers.GetActiveSubscription(userIDStr)
	if err != nil {
		Helpers.JSONError(w, "Active subscription not found", http.StatusForbidden)
		return
	}
	if sub.ModelsUsedThisMonth >= sub.MonthlyLimit {
		Helpers.JSONError(w, "Monthly valuation limit reached. Please upgrade your plan.", http.StatusPaymentRequired)
		return
	}
	if req.ModelType != "comparable" && sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your plan to use advanced models.", http.StatusForbidden)
		return
	}

	propType := portfolioPropTypeToEngine(pp.PropertyType)
	condition := pp.Condition
	if condition == "" {
		condition = "Good"
	}

	estimated, confidence := Services.ComputeValuation(
		req.ModelType, propType, pp.State, req.IsPremium,
		pp.LandAreaSqm, pp.BuildingAreaSqm, condition, req.Inputs,
	)

	userID, _ := uuid.Parse(userIDStr)
	property := Models.Property{
		UserID:          userID,
		Type:            propType,
		State:           pp.State,
		IsPremium:       req.IsPremium,
		LandAreaSqm:     pp.LandAreaSqm,
		BuildingAreaSqm: pp.BuildingAreaSqm,
		Condition:       condition,
	}
	Config.DB.Create(&property)

	inputsJSON, _ := json.Marshal(req.Inputs)
	model := Models.ValuationModel{
		UserID:          userID,
		PropertyID:      property.ID,
		ModelType:       req.ModelType,
		Inputs:          string(inputsJSON),
		EstimatedValue:  estimated,
		ConfidenceScore: confidence,
	}
	if err := Config.DB.Create(&model).Error; err != nil {
		Helpers.JSONError(w, "Failed to save valuation model", http.StatusInternalServerError)
		return
	}

	Config.DB.Model(&pp).Update("current_value", estimated)
	Config.DB.Model(&sub).Update("models_used_this_month", sub.ModelsUsedThisMonth+1)

	var full Models.ValuationModel
	Config.DB.Preload("Property").First(&full, "id = ?", model.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"model_id":         model.ID,
		"estimated_value":  estimated,
		"confidence_score": confidence,
		"model":            full,
	})
}

func portfolioPropTypeToEngine(t string) string {
	switch strings.ToLower(t) {
	case "apartment", "flat", "condo":
		return "Apartment"
	case "land", "plot":
		return "Land"
	case "commercial", "industrial", "mixed use", "office", "shop", "warehouse":
		return "Commercial"
	default:
		return "House"
	}
}

// CreateTenant adds a new tenant
func CreateTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr := r.Context().Value("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req Models.Tenant
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.UserID = userID

	if err := Config.DB.Create(&req).Error; err != nil {
		Helpers.JSONError(w, "Failed to create tenant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// CreateLease adds a new lease and automatically computes rent due
func CreateLease(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		Helpers.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req Models.Lease
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Helpers.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Calculate next due date automatically based on start date and frequency
	req.NextDueDate = req.StartDate
	if req.PaymentFrequency == "Monthly" {
		req.NextDueDate = req.StartDate.AddDate(0, 1, 0)
	} else if req.PaymentFrequency == "Yearly" {
		req.NextDueDate = req.StartDate.AddDate(1, 0, 0)
	}

	if err := Config.DB.Create(&req).Error; err != nil {
		Helpers.JSONError(w, "Failed to create lease", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

