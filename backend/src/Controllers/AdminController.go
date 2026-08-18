package Controllers

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"provaluer-api/src/Config"
	"provaluer-api/src/Models"
)

type AdminStatsResponse struct {
	TotalUsers         int64   `json:"total_users"`
	TotalActiveSubs    int64   `json:"total_active_subs"`
	TotalModels        int64   `json:"total_models"`
	EstimatedMRR       float64 `json:"estimated_mrr"` // Monthly recurring revenue
}

func GetStatsAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	var totalUsers int64
	var totalActiveSubs int64
	var totalModels int64

	Config.DB.Model(&Models.User{}).Count(&totalUsers)
	Config.DB.Model(&Models.Subscription{}).Where("is_active = ? AND plan_tier != ?", true, "Free").Count(&totalActiveSubs)
	Config.DB.Model(&Models.ValuationModel{}).Count(&totalModels)

	// Stub for MRR calculation. In a real scenario, this would aggregate from the Payments table.
	// Assume Pro is 15000 NGN and Enterprise is 50000 NGN
	var proCount int64
	var entCount int64
	Config.DB.Model(&Models.Subscription{}).Where("is_active = ? AND plan_tier = ?", true, "Professional").Count(&proCount)
	Config.DB.Model(&Models.Subscription{}).Where("is_active = ? AND plan_tier = ?", true, "Enterprise").Count(&entCount)
	
	estimatedMRR := float64(proCount)*15000.0 + float64(entCount)*50000.0

	JSONAdminResponse(w, http.StatusOK, map[string]interface{}{
		"total_users":       totalUsers,
		"total_active_subs": totalActiveSubs,
		"total_models":      totalModels,
		"estimated_mrr":     estimatedMRR,
	}, "")
}

func GetUsersAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	var users []Models.User
	if err := Config.DB.Preload("Subscriptions").Find(&users).Error; err != nil {
		JSONAdminResponse(w, http.StatusInternalServerError, nil, "Failed to fetch users")
		return
	}

	JSONAdminResponse(w, http.StatusOK, users, "")
}

type OverrideSubRequest struct {
	UserID           string `json:"user_id"`
	PlanTier         string `json:"plan_tier"`
	MonthlyLimit     int    `json:"monthly_limit"`
	CustomAgencyName string `json:"custom_agency_name"`
	CustomBrandColor string `json:"custom_brand_color"`
	CustomLogo       string `json:"custom_logo"`
	CustomFont       string `json:"custom_font"`
}

func OverrideSubscriptionAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	var req OverrideSubRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JSONAdminResponse(w, http.StatusBadRequest, nil, "Invalid request body")
		return
	}

	if req.UserID == "" {
		JSONAdminResponse(w, http.StatusBadRequest, nil, "User ID is required")
		return
	}

	// Preserve current usage before deactivating
	var currentSub Models.Subscription
	var currentUsage int
	previousTier := ""
	if err := Config.DB.Where("user_id = ? AND is_active = ?", req.UserID, true).First(&currentSub).Error; err == nil {
		currentUsage = currentSub.ModelsUsedThisMonth
		previousTier = currentSub.PlanTier
	}

	// Deactivate existing subs
	Config.DB.Model(&Models.Subscription{}).Where("user_id = ?", req.UserID).Update("is_active", false)

	// Create new sub, carrying over usage so it is not reset
	newSub := Models.Subscription{
		UserID:              uuid.MustParse(req.UserID),
		PlanTier:            req.PlanTier,
		MonthlyLimit:        req.MonthlyLimit,
		ModelsUsedThisMonth: currentUsage,
		CustomAgencyName:    req.CustomAgencyName,
		CustomBrandColor:    req.CustomBrandColor,
		CustomLogo:          req.CustomLogo,
		CustomFont:          req.CustomFont,
		IsActive:            true,
		ExpiresAt:           time.Now().AddDate(0, 1, 0),
	}

	if err := Config.DB.Create(&newSub).Error; err != nil {
		JSONAdminResponse(w, http.StatusInternalServerError, nil, "Failed to create new subscription")
		return
	}

	// Let the user know their plan changed, same as a self-service upgrade.
	notifySubscriptionChange(req.UserID, req.PlanTier, previousTier, req.MonthlyLimit)

	JSONAdminResponse(w, http.StatusOK, map[string]string{"message": "Subscription overridden successfully"}, "")
}

// GetMarketDataAdmin returns paginated scraped property listings with search and filter support.
// Query params: page, per_page, search (area/title), state, type, status, is_premium
func GetMarketDataAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	q := r.URL.Query()
	page := queryInt(q.Get("page"), 1)
	perPage := queryInt(q.Get("per_page"), 50)
	if perPage > 200 {
		perPage = 200
	}
	offset := (page - 1) * perPage

	search := q.Get("search")
	state := q.Get("state")
	propType := q.Get("type")
	status := q.Get("status")
	isPremiumStr := q.Get("is_premium")

	query := Config.DB.Model(&Models.ScrapedProperty{})

	if search != "" {
		query = query.Where("area_name ILIKE ? OR title ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if state != "" {
		query = query.Where("state = ?", state)
	}
	if propType != "" {
		query = query.Where("property_type = ?", propType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if isPremiumStr == "true" {
		query = query.Where("is_premium = ?", true)
	} else if isPremiumStr == "false" {
		query = query.Where("is_premium = ?", false)
	}

	var total int64
	query.Count(&total)

	var listings []Models.ScrapedProperty
	query.Order("scraped_at DESC").Offset(offset).Limit(perPage).Find(&listings)

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	JSONAdminResponse(w, http.StatusOK, map[string]interface{}{
		"listings":    listings,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"total_pages": totalPages,
	}, "")
}

// GetMarketDataStatsAdmin returns aggregate stats about the scraped property dataset.
func GetMarketDataStatsAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONAdminResponse(w, http.StatusMethodNotAllowed, nil, "Method not allowed")
		return
	}

	type StateCount struct {
		State    string  `json:"state"`
		Count    int     `json:"count"`
		AvgPrice float64 `json:"avg_price"`
	}
	type TypeCount struct {
		PropertyType string `json:"property_type"`
		Count        int    `json:"count"`
	}

	var total int64
	Config.DB.Model(&Models.ScrapedProperty{}).Count(&total)

	var lastScrapedAt *time.Time
	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("MAX(scraped_at)").
		Scan(&lastScrapedAt)

	var byState []StateCount
	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("state, COUNT(*) as count, AVG(price) as avg_price").
		Group("state").
		Order("count DESC").
		Limit(20).
		Scan(&byState)

	var byType []TypeCount
	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("property_type, COUNT(*) as count").
		Group("property_type").
		Order("count DESC").
		Scan(&byType)

	JSONAdminResponse(w, http.StatusOK, map[string]interface{}{
		"total":           total,
		"last_scraped_at": lastScrapedAt,
		"by_state":        byState,
		"by_type":         byType,
	}, "")
}

func queryInt(s string, def int) int {
	if v, err := strconv.Atoi(s); err == nil && v > 0 {
		return v
	}
	return def
}

// GetStateRatesAdmin returns all state rates ordered by state name.
func GetStateRatesAdmin(w http.ResponseWriter, r *http.Request) {
	var rates []Models.StateRate
	Config.DB.Order("state, is_premium").Find(&rates)
	JSONAdminResponse(w, http.StatusOK, rates, "")
}

// UpdateStateRatesAdmin accepts a JSON array of {state, is_premium, land_rate_per_sqm, building_rate_per_sqm}.
func UpdateStateRatesAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var updates []struct {
		State              string  `json:"state"`
		IsPremium          bool    `json:"is_premium"`
		LandRatePerSqm     float64 `json:"land_rate_per_sqm"`
		BuildingRatePerSqm float64 `json:"building_rate_per_sqm"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		JSONAdminResponse(w, http.StatusBadRequest, nil, "invalid request body")
		return
	}
	now := time.Now()
	for _, u := range updates {
		Config.DB.Model(&Models.StateRate{}).
			Where("state = ? AND is_premium = ?", u.State, u.IsPremium).
			Updates(map[string]interface{}{
				"land_rate_per_sqm":     u.LandRatePerSqm,
				"building_rate_per_sqm": u.BuildingRatePerSqm,
				"updated_at":            now,
			})
	}
	JSONAdminResponse(w, http.StatusOK, map[string]string{"status": "saved"}, "")
}

// GetMaterialCostsAdmin returns all material cost config rows ordered by category.
func GetMaterialCostsAdmin(w http.ResponseWriter, r *http.Request) {
	var costs []Models.MaterialCostConfig
	Config.DB.Order("category, id").Find(&costs)
	JSONAdminResponse(w, http.StatusOK, costs, "")
}

// UpdateMaterialCostsAdmin accepts a JSON array of {key, value} and updates each row.
func UpdateMaterialCostsAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var updates []struct {
		Key   string  `json:"key"`
		Value float64 `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		JSONAdminResponse(w, http.StatusBadRequest, nil, "invalid request body")
		return
	}
	now := time.Now()
	for _, u := range updates {
		Config.DB.Model(&Models.MaterialCostConfig{}).
			Where("key = ?", u.Key).
			Updates(map[string]interface{}{"value": u.Value, "updated_at": now})
	}
	JSONAdminResponse(w, http.StatusOK, map[string]string{"status": "saved"}, "")
}
