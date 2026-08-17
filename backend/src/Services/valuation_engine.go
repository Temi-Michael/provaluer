package Services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"provaluer-api/src/Config"
	"provaluer-api/src/Models"
)

// Confidence bounds and methodology penalties.
//
// Every model derives its confidence from the quality of the market data it
// actually used (sample size, dispersion, recency) and then pays a penalty for
// the assumptions it layers on top of that data. The penalties follow the usual
// appraisal hierarchy: the further a model projects beyond observed prices, the
// less certain its output.
const (
	minConfidence = 50
	maxConfidence = 98

	// Confidence used when a model falls back to configured static rates
	// because no usable market comparables exist.
	staticFallbackConfidence = 60

	// Confidence in a rent figure the user supplied themselves (actual contract
	// rent is a known quantity; only the capitalisation assumptions are uncertain).
	suppliedRentConfidence = 90

	incomeMethodPenalty = 4  // capitalisation rate + operating expense ratio
	costMethodPenalty   = 2  // depreciation rate
	dcfMethodPenalty    = 10 // 5-year growth, discount and exit-cap projections

	// The absolute-price comparable path scales a median listing price by a size
	// proxy rather than comparing like-for-like per sqm, so it earns less trust.
	absolutePriceProxyPenalty = 8
)

func clampConfidence(score int) int {
	if score < minConfidence {
		return minConfidence
	}
	if score > maxConfidence {
		return maxConfidence
	}
	return score
}

// marketConfidence scores a comparable set using the same statistical basis as
// the comparable model. ok is false when the set is too thin to be meaningful.
func marketConfidence(comps []Models.ScrapedProperty) (int, bool) {
	if len(comps) < 3 {
		return 0, false
	}
	if perSqm := filterIQR(pricesPerSqm(comps)); len(perSqm) >= 3 {
		mean := meanFloat(perSqm)
		return dynamicConfidence(len(perSqm), mean, stdDevFloat(perSqm, mean), avgAgeDays(comps)), true
	}
	if prices := filterIQR(absolutePrices(comps)); len(prices) >= 3 {
		mean := meanFloat(prices)
		conf := dynamicConfidence(len(prices), mean, stdDevFloat(prices, mean), avgAgeDays(comps))
		return clampConfidence(conf - absolutePriceProxyPenalty), true
	}
	return 0, false
}

// ComputeValuation is the single entrypoint for all valuation models.
// It uses real scraped market data where available, falling back to
// static rates when the comparable dataset is too thin (< 3 records).
func ComputeValuation(
	modelType, propertyType, state string,
	isPremium bool,
	landArea, buildingArea float64,
	condition string,
	inputs map[string]interface{},
) (float64, int) {
	condMult := conditionMultiplier(condition, propertyType)
	typeMult := typeMultiplier(propertyType)

	if propertyType == "Land" {
		buildingArea = 0
	}

	switch strings.ToLower(modelType) {
	case "comparable":
		return computeComparable(state, propertyType, isPremium, landArea, buildingArea, condMult, typeMult)
	case "income":
		return computeIncome(state, isPremium, landArea, buildingArea, condMult, inputs)
	case "cost":
		return computeCost(state, propertyType, isPremium, landArea, buildingArea, condMult, inputs)
	case "dcf":
		return computeDCF(state, isPremium, landArea, buildingArea, condMult, inputs)
	default:
		return computeComparable(state, propertyType, isPremium, landArea, buildingArea, condMult, typeMult)
	}
}

// — Comparable Sales Approach —

func computeComparable(state, propertyType string, isPremium bool, landArea, buildingArea, condMult, typeMult float64) (float64, int) {
	comps := querySaleComparables(state, propertyType, isPremium)

	if len(comps) >= 3 {
		// Path A: listings have area data — use price-per-sqm (most accurate)
		perSqm := filterIQR(pricesPerSqm(comps))
		if len(perSqm) >= 3 {
			median := medianFloat(perSqm)
			mean := meanFloat(perSqm)
			stdDev := stdDevFloat(perSqm, mean)
			refArea := landArea
			if refArea <= 0 {
				refArea = buildingArea
			}
			value := refArea * median * condMult * typeMult
			return value, dynamicConfidence(len(perSqm), mean, stdDev, avgAgeDays(comps))
		}

		// Path B: area not on listing cards (NPC) — use median total price scaled to subject size
		rawPrices := absolutePrices(comps)
		filtered := filterIQR(rawPrices)
		if len(filtered) >= 3 {
			median := medianFloat(filtered)
			mean := meanFloat(filtered)
			stdDev := stdDevFloat(filtered, mean)

			// Scale median price by how the subject property's area compares to the
			// typical size for this property type, so larger properties get higher values.
			ratio := areaRatio(propertyType, isPremium, landArea, buildingArea)
			value := median * ratio * condMult * typeMult
			// Lower confidence than per-sqm path because we're scaling by a proxy
			conf := dynamicConfidence(len(filtered), mean, stdDev, avgAgeDays(comps)) - 8
			if conf < 50 {
				conf = 50
			}
			return value, conf
		}
	}

	// Static fallback when scraped data is completely absent
	land, building := staticRates(state, isPremium)
	value := (landArea*land + buildingArea*building) * condMult * typeMult
	return value, 60
}

// — Income Capitalisation Approach —

func computeIncome(state string, isPremium bool, landArea, buildingArea, condMult float64, inputs map[string]interface{}) (float64, int) {
	grossRent := floatInput(inputs, "gross_rent")
	capRate := floatInputDefault(inputs, "cap_rate", 8.5)
	opexRatio := floatInputDefault(inputs, "opex_ratio", 0.15)

	// Confidence tracks where the rent figure came from: a user-supplied contract
	// rent is near-certain, an estimate is only as good as its comparables.
	conf := suppliedRentConfidence
	if grossRent <= 0 {
		grossRent, conf = estimateRent(state, isPremium, landArea, buildingArea, condMult)
	}
	if capRate <= 0 {
		capRate = 8.5
	}

	noi := grossRent * (1.0 - opexRatio)
	return noi / (capRate / 100.0), clampConfidence(conf - incomeMethodPenalty)
}

// — Cost Approach —

// loadBuildRates reads admin-configured construction rates from the DB.
// Falls back to sensible defaults if the table has no data yet.
func loadBuildRates() (standard, premium, commercial float64) {
	standard, premium, commercial = 250000, 500000, 350000
	var costs []Models.MaterialCostConfig
	keys := []string{"build_rate_standard", "build_rate_premium", "build_rate_commercial"}
	if err := Config.DB.Where("key IN ?", keys).Find(&costs).Error; err != nil {
		return
	}
	for _, c := range costs {
		switch c.Key {
		case "build_rate_standard":
			if c.Value > 0 {
				standard = c.Value
			}
		case "build_rate_premium":
			if c.Value > 0 {
				premium = c.Value
			}
		case "build_rate_commercial":
			if c.Value > 0 {
				commercial = c.Value
			}
		}
	}
	return
}

// loadRentRate reads the admin-configured annual rent per sqm used when no rent
// comparables are available. Falls back to defaults if the table has no data yet.
func loadRentRate(isPremium bool) float64 {
	key, fallback := "rent_rate_standard", 15000.0
	if isPremium {
		key, fallback = "rent_rate_premium", 45000.0
	}
	var cfg Models.MaterialCostConfig
	if err := Config.DB.Where("key = ?", key).First(&cfg).Error; err == nil && cfg.Value > 0 {
		return cfg.Value
	}
	return fallback
}

func computeCost(state, propertyType string, isPremium bool, landArea, buildingArea, condMult float64, inputs map[string]interface{}) (float64, int) {
	depRate := floatInputDefault(inputs, "depreciation_rate", 0.12)

	// Land rate remains state-specific (location drives land price more than materials do)
	land, _ := staticRates(state, isPremium)

	// Building rate comes from admin-managed material cost config
	stdRate, premRate, commRate := loadBuildRates()
	building := stdRate
	if isPremium {
		building = premRate
	}
	if strings.EqualFold(propertyType, "commercial") {
		building = commRate
	}

	// User-supplied overrides always win
	if v := floatInput(inputs, "custom_land_rate"); v > 0 {
		land = v
	}
	if v := floatInput(inputs, "custom_building_rate"); v > 0 {
		building = v
	}

	// Try to replace static land rate with dynamic comparable from scraped Land listings.
	// Confidence follows the land data: configured rates alone are worth far less
	// than a live comparable set.
	conf := staticFallbackConfidence
	landComps := querySaleComparables(state, "Land", isPremium)
	if len(landComps) >= 3 {
		perSqm := filterIQR(pricesPerSqm(landComps))
		if len(perSqm) >= 3 {
			land = medianFloat(perSqm)
			if c, ok := marketConfidence(landComps); ok {
				conf = c
			}
		} else {
			// Derive implied land rate from median land price ÷ typical land area
			prices := filterIQR(absolutePrices(landComps))
			if len(prices) >= 3 {
				typical := typicalLandAreaSqm(isPremium)
				if typical > 0 {
					land = medianFloat(prices) / typical
					if c, ok := marketConfidence(landComps); ok {
						conf = c
					}
				}
			}
		}
	}

	replacementCost := buildingArea * building
	depreciatedBuilding := replacementCost * (1.0 - depRate)
	return landArea*land + depreciatedBuilding, clampConfidence(conf - costMethodPenalty)
}

// — Discounted Cash Flow Approach —

func computeDCF(state string, isPremium bool, landArea, buildingArea, condMult float64, inputs map[string]interface{}) (float64, int) {
	initialRent := floatInput(inputs, "gross_rent")
	growthRate := floatInputDefault(inputs, "growth_rate", 5.0)
	discountRate := floatInputDefault(inputs, "discount_rate", 12.0)
	exitCap := floatInputDefault(inputs, "exit_cap_rate", 8.0)
	opexRatio := floatInputDefault(inputs, "opex_ratio", 0.15)

	conf := suppliedRentConfidence
	if initialRent <= 0 {
		initialRent, conf = estimateRent(state, isPremium, landArea, buildingArea, condMult)
	}

	r := discountRate / 100.0
	g := growthRate / 100.0
	c := exitCap / 100.0

	var pv float64
	currentRent := initialRent
	for year := 1; year <= 5; year++ {
		cf := currentRent * (1.0 - opexRatio)
		discount := math.Pow(1.0+r, float64(year))
		pv += cf / discount

		if year == 5 {
			nextRent := currentRent * (1.0 + g)
			terminal := (nextRent * (1.0 - opexRatio)) / c
			pv += terminal / discount
		}
		currentRent *= (1.0 + g)
	}
	return pv, clampConfidence(conf - dcfMethodPenalty)
}

// estimateRent derives an annual gross rent from rent comparables, falling back
// to admin-configured static rates. It also reports how much confidence the
// underlying data supports, so income-based models can score themselves honestly.
func estimateRent(state string, isPremium bool, landArea, buildingArea, condMult float64) (float64, int) {
	rentComps := queryRentComparables(state, isPremium)

	if len(rentComps) >= 3 {
		// Path A: per-sqm when area data available
		if perSqm := filterIQR(pricesPerSqm(rentComps)); len(perSqm) >= 3 {
			area := buildingArea
			if area <= 0 {
				area = landArea * 0.4
			}
			mean := meanFloat(perSqm)
			conf := dynamicConfidence(len(perSqm), mean, stdDevFloat(perSqm, mean), avgAgeDays(rentComps))
			return area * medianFloat(perSqm) * condMult, conf
		}
		// Path B: median rent price scaled by subject size
		if filtered := filterIQR(absolutePrices(rentComps)); len(filtered) >= 3 {
			ratio := areaRatio("House", isPremium, landArea, buildingArea)
			mean := meanFloat(filtered)
			conf := dynamicConfidence(len(filtered), mean, stdDevFloat(filtered, mean), avgAgeDays(rentComps))
			return medianFloat(filtered) * ratio * condMult, clampConfidence(conf - absolutePriceProxyPenalty)
		}
	}

	// Static fallback — rates are admin-managed, not hardcoded.
	rentRate := loadRentRate(isPremium)
	area := buildingArea
	if area <= 0 {
		area = landArea * 0.4
	}
	return area * rentRate * condMult, staticFallbackConfidence
}

// — Database queries —

func querySaleComparables(state, propertyType string, isPremium bool) []Models.ScrapedProperty {
	var comps []Models.ScrapedProperty
	since := time.Now().AddDate(0, 0, -90)
	// No area constraint — NPC cards don't expose sqm so land_area_sqm is 0 on most listings.
	// The comparable engine handles both per-sqm and absolute-price paths.
	Config.DB.Where(
		"state = ? AND property_type IN ? AND status = ? AND is_premium = ? AND price > 0 AND scraped_at > ?",
		state, propertyTypeFamily(propertyType), "For Sale", isPremium, since,
	).Limit(500).Find(&comps)
	return comps
}

func queryRentComparables(state string, isPremium bool) []Models.ScrapedProperty {
	var comps []Models.ScrapedProperty
	since := time.Now().AddDate(0, 0, -90)
	Config.DB.Where(
		"state = ? AND status = ? AND is_premium = ? AND price > 0 AND scraped_at > ?",
		state, "For Rent", isPremium, since,
	).Limit(500).Find(&comps)
	return comps
}

// QueryMarketStats returns aggregate market data per state for the intelligence endpoint.
func QueryMarketStats() []StateMarketStat {
	var results []StateMarketStat
	since := time.Now().AddDate(0, 0, -90)

	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("state, AVG(price / NULLIF(land_area_sqm, 0)) as avg_price_per_sqm, COUNT(*) as total_listings").
		Where("status = ? AND price > 0 AND land_area_sqm > 0 AND scraped_at > ?", "For Sale", since).
		Group("state").
		Order("total_listings DESC").
		Limit(15).
		Scan(&results)

	return results
}

// QueryTrendingType returns the property type with the most listings in the last 30 days.
func QueryTrendingType() string {
	var result struct {
		PropertyType string
		Count        int
	}
	since := time.Now().AddDate(0, 0, -30)
	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("property_type, COUNT(*) as count").
		Where("scraped_at > ?", since).
		Group("property_type").
		Order("count DESC").
		First(&result)

	if result.PropertyType == "" {
		return "Residential (Duplex)"
	}
	return result.PropertyType
}

// QueryTotalVolume returns the total market value of all scraped for-sale listings.
func QueryTotalVolume() float64 {
	var total float64
	since := time.Now().AddDate(0, 0, -90)
	Config.DB.Model(&Models.ScrapedProperty{}).
		Select("COALESCE(SUM(price), 0)").
		Where("status = ? AND scraped_at > ?", "For Sale", since).
		Scan(&total)
	return total
}

type StateMarketStat struct {
	State          string  `json:"state"`
	AvgPricePerSqm float64 `json:"avg_price_per_sqm"`
	TotalListings  int     `json:"total_listings"`
}

// propertyTypeFamily broadens the property type match for robust comparable retrieval.
func propertyTypeFamily(propertyType string) []string {
	switch propertyType {
	case "Land":
		return []string{"Land"}
	case "Commercial":
		return []string{"Commercial"}
	case "Apartment":
		return []string{"Apartment", "House"}
	default: // House
		return []string{"House", "Apartment"}
	}
}

// — Statistical helpers —

func pricesPerSqm(comps []Models.ScrapedProperty) []float64 {
	var prices []float64
	for _, c := range comps {
		area := c.LandAreaSqm
		if area <= 0 {
			area = c.BuildingAreaSqm
		}
		if area > 0 && c.Price > 0 {
			prices = append(prices, c.Price/area)
		}
	}
	return prices
}

// absolutePrices returns raw listing prices (no area normalisation).
// Used as a fallback when scraped listings have no area data.
func absolutePrices(comps []Models.ScrapedProperty) []float64 {
	var prices []float64
	for _, c := range comps {
		if c.Price > 0 {
			prices = append(prices, c.Price)
		}
	}
	return prices
}

// areaRatio returns how the subject property's area compares to the typical
// size for its type, so that a larger property gets a proportionally higher value
// when we're using median absolute price as the comparable base.
func areaRatio(propertyType string, isPremium bool, landArea, buildingArea float64) float64 {
	typical := typicalBuildAreaSqm(propertyType, isPremium)
	ref := buildingArea
	if ref <= 0 {
		ref = landArea
	}
	if ref <= 0 || typical <= 0 {
		return 1.0
	}
	ratio := ref / typical
	// Dampen to [0.4, 2.5] — prevents wild swings for unusual properties
	if ratio < 0.4 {
		return 0.4
	}
	if ratio > 2.5 {
		return 2.5
	}
	return ratio
}

// typicalBuildAreaSqm is a calibrated reference size per property type used
// when computing areaRatio against a median comparable price.
func typicalBuildAreaSqm(propertyType string, isPremium bool) float64 {
	switch propertyType {
	case "Apartment":
		if isPremium {
			return 120
		}
		return 80
	case "Land":
		return typicalLandAreaSqm(isPremium)
	case "Commercial":
		if isPremium {
			return 400
		}
		return 250
	default: // House
		if isPremium {
			return 350
		}
		return 200
	}
}

func typicalLandAreaSqm(isPremium bool) float64 {
	if isPremium {
		return 600
	}
	return 400
}

// filterIQR removes outliers using the 1.5×IQR rule applied to price-per-sqm values.
func filterIQR(values []float64) []float64 {
	if len(values) < 4 {
		return values
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	q1 := percentile(sorted, 25)
	q3 := percentile(sorted, 75)
	iqr := q3 - q1
	lower := q1 - 1.5*iqr
	upper := q3 + 1.5*iqr

	var filtered []float64
	for _, v := range sorted {
		if v >= lower && v <= upper {
			filtered = append(filtered, v)
		}
	}
	return filtered
}

func percentile(sorted []float64, p float64) float64 {
	n := float64(len(sorted))
	idx := p / 100.0 * (n - 1)
	lo := int(math.Floor(idx))
	hi := lo + 1
	if hi >= len(sorted) {
		return sorted[len(sorted)-1]
	}
	frac := idx - float64(lo)
	return sorted[lo]*(1-frac) + sorted[hi]*frac
}

func medianFloat(sorted []float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2.0
	}
	return sorted[n/2]
}

func meanFloat(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func stdDevFloat(values []float64, mean float64) float64 {
	if len(values) < 2 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		d := v - mean
		sum += d * d
	}
	return math.Sqrt(sum / float64(len(values)-1))
}

func avgAgeDays(comps []Models.ScrapedProperty) float64 {
	if len(comps) == 0 {
		return 0
	}
	now := time.Now()
	total := 0.0
	for _, c := range comps {
		total += now.Sub(c.ScrapedAt).Hours() / 24
	}
	return total / float64(len(comps))
}

// dynamicConfidence calculates confidence in [50, 98] based on the spec in scrape.md.
func dynamicConfidence(sampleSize int, mean, stdDev, avgAge float64) int {
	if sampleSize < 3 {
		return 50
	}

	score := 60.0

	// Sample size bonus: +4% per comparable beyond 3, capped at +25%
	bonus := float64(sampleSize-3) * 4
	if bonus > 25 {
		bonus = 25
	}
	score += bonus

	// Variance penalty: -5% per 0.10 CV above 0.15, capped at -20%
	if mean > 0 {
		cv := stdDev / mean
		if cv > 0.15 {
			excess := cv - 0.15
			penalty := math.Floor(excess/0.10) * 5
			if penalty > 20 {
				penalty = 20
			}
			score -= penalty
		}
	}

	// Recency penalty
	switch {
	case avgAge <= 30:
		// no penalty
	case avgAge <= 90:
		score -= 5
	default:
		score -= 15
	}

	// Clamp
	if score < 50 {
		score = 50
	}
	if score > 98 {
		score = 98
	}
	return int(score)
}

// — Property attribute helpers —

// conditionMultiplier adjusts value for the state of the asset. Land is scored on
// servicing and terrain rather than building condition — undeveloped land cannot
// be "Newly Built" or "Dilapidated".
func conditionMultiplier(condition, propertyType string) float64 {
	if strings.EqualFold(propertyType, "Land") {
		return landConditionMultiplier(condition)
	}
	return buildingConditionMultiplier(condition)
}

func buildingConditionMultiplier(condition string) float64 {
	switch {
	case strings.HasPrefix(condition, "Excellent"):
		return 1.05
	case strings.HasPrefix(condition, "Good"):
		return 0.95
	case strings.HasPrefix(condition, "Fair"):
		return 0.75
	case strings.HasPrefix(condition, "Poor"):
		return 0.45
	default:
		return 0.95
	}
}

// landConditionMultiplier scores undeveloped land on how ready it is to build on.
// Legacy records that stored a building condition fall through to the building
// scale so historical valuations still compute.
func landConditionMultiplier(condition string) float64 {
	switch {
	case strings.HasPrefix(condition, "Fully Serviced"):
		return 1.05
	case strings.HasPrefix(condition, "Partially Serviced"):
		return 0.95
	case strings.HasPrefix(condition, "Unserviced"):
		return 0.80
	case strings.HasPrefix(condition, "Difficult Terrain"):
		return 0.55
	default:
		return buildingConditionMultiplier(condition)
	}
}

func typeMultiplier(propertyType string) float64 {
	switch propertyType {
	case "Commercial":
		return 1.15
	case "Industrial":
		return 1.10
	case "Land":
		return 0.85
	default:
		return 1.0
	}
}

// staticRates reads per-state land and building rates from the DB (admin-managed).
// Falls back to the "Default" row, then to hardcoded minimums if the DB is unavailable.
func staticRates(state string, isPremium bool) (landRate, buildingRate float64) {
	var row Models.StateRate

	// Try exact state match first
	if err := Config.DB.Where("state = ? AND is_premium = ?", state, isPremium).First(&row).Error; err == nil {
		return row.LandRatePerSqm, row.BuildingRatePerSqm
	}

	// Fall back to the "Default" catch-all row
	if err := Config.DB.Where("state = ? AND is_premium = ?", "Default", isPremium).First(&row).Error; err == nil {
		return row.LandRatePerSqm, row.BuildingRatePerSqm
	}

	// Last-resort in-memory minimum — only reached if DB is completely unavailable
	if isPremium {
		return 87500, 264000
	}
	return 25000, 120000
}

func floatInput(inputs map[string]interface{}, key string) float64 {
	val, ok := inputs[key]
	if !ok {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return v
	case string:
		var f float64
		fmt.Sscanf(v, "%f", &f)
		return f
	}
	return 0
}

func floatInputDefault(inputs map[string]interface{}, key string, def float64) float64 {
	if v := floatInput(inputs, key); v > 0 {
		return v
	}
	return def
}
