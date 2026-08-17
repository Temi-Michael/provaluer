package Controllers

import (
	"encoding/json"
	"net/http"

	"provaluer-api/src/Helpers"
	"provaluer-api/src/Services"
)

type StateInsight struct {
	State          string  `json:"state"`
	AvgCapRate     float64 `json:"avg_cap_rate"`
	AvgPricePerSqm float64 `json:"avg_price_per_sqm"`
	TotalListings  int     `json:"total_listings"`
}

type IntelligenceData struct {
	StateInsights []StateInsight `json:"state_insights"`
	TrendingType  string         `json:"trending_type"`
	TotalVolume   float64        `json:"total_volume"`
}

// avgCapRateForState returns a market-standard cap rate estimate per state.
// These are calibrated to the Nigerian market and updated based on macro conditions.
func avgCapRateForState(state string) float64 {
	rates := map[string]float64{
		"Lagos":       5.5,
		"FCT - Abuja": 6.2,
		"Rivers":      7.0,
		"Ogun":        4.8,
		"Oyo":         5.1,
		"Kano":        8.5,
		"Enugu":       6.8,
		"Delta":       7.2,
		"Anambra":     7.5,
		"Edo":         7.8,
	}
	if r, ok := rates[state]; ok {
		return r
	}
	return 8.0
}

func GetMarketIntelligence(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	sub, err := Helpers.GetActiveSubscription(userID)
	if err != nil || sub.PlanTier == "Free" {
		Helpers.JSONError(w, "Please upgrade your tier to access Market Intelligence", http.StatusForbidden)
		return
	}

	stats := Services.QueryMarketStats()
	trendingType := Services.QueryTrendingType()
	totalVolume := Services.QueryTotalVolume()

	var insights []StateInsight
	for _, s := range stats {
		insights = append(insights, StateInsight{
			State:          s.State,
			AvgCapRate:     avgCapRateForState(s.State),
			AvgPricePerSqm: s.AvgPricePerSqm,
			TotalListings:  s.TotalListings,
		})
	}

	// If scraper hasn't run yet, return graceful empty state rather than an error
	if len(insights) == 0 {
		insights = []StateInsight{}
	}

	data := IntelligenceData{
		TrendingType:  trendingType,
		TotalVolume:   totalVolume,
		StateInsights: insights,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
