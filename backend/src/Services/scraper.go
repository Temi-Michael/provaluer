package Services

import (
	"crypto/md5"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
	"gorm.io/gorm/clause"
	"provaluer-api/src/Config"
	"provaluer-api/src/Models"
)

const (
	scraperUserAgent = "ProvaluerSurveyBot/1.0 (+https://provaluer.com/bot)"
	maxPagesPerFeed  = 15
)

type stateConfig struct {
	Slug         string
	CanonName    string
	PremiumAreas []string
}

// nigerianStates covers the 10 highest-volume property markets in Nigeria.
// Expand this slice to add more states as data grows.
var nigerianStates = []stateConfig{
	{
		Slug:      "lagos",
		CanonName: "Lagos",
		PremiumAreas: []string{
			"victoria island", " vi ", "v.i.", "ikoyi", "banana island",
			"lekki phase 1", "lekki phase 2", "eti osa", "bourdillon",
			"oniru", "parkview", "old ikoyi", "osborne",
		},
	},
	{
		Slug:      "abuja",
		CanonName: "FCT - Abuja",
		PremiumAreas: []string{
			"maitama", "asokoro", "wuse 2", "wuse ii", "jabi", "utako",
			"life camp", "katampe extension", "diplomatic zone", "guzape", "nbora",
		},
	},
	{
		Slug:      "rivers",
		CanonName: "Rivers",
		PremiumAreas: []string{
			"gra", "old gra", "rumuola", "peter odili", "trans amadi", "rumuibekwe",
		},
	},
	{
		Slug:      "oyo",
		CanonName: "Oyo",
		PremiumAreas: []string{
			"bodija", "agodi gra", "jericho", "oluyole estate", "new bodija", "ring road",
		},
	},
	{
		Slug:      "ogun",
		CanonName: "Ogun",
		PremiumAreas: []string{
			"sagamu", "abeokuta gra", "obafemi owode", "redemption camp",
		},
	},
	{
		Slug:      "delta",
		CanonName: "Delta",
		PremiumAreas: []string{"gra", "asaba gra", "effurun gra", "airport road"},
	},
	{
		Slug:      "anambra",
		CanonName: "Anambra",
		PremiumAreas: []string{"awka", "nnewi", "onitsha gra", "nkpor"},
	},
	{
		Slug:      "enugu",
		CanonName: "Enugu",
		PremiumAreas: []string{"gra", "independence layout", "trans ekulu", "gra phase 2"},
	},
	{
		Slug:      "kano",
		CanonName: "Kano",
		PremiumAreas: []string{"nasarawa gra", "kano gra", "kabuga", "sabon gari"},
	},
	{
		Slug:      "edo",
		CanonName: "Edo",
		PremiumAreas: []string{"gra", "benin gra", "new benin", "independence way", "oka"},
	},
}

var (
	// NPC listing URLs look like: /for-sale/houses/.../3244400-title-here
	// The numeric ID is always 5+ digits at the start of the last path segment
	rePID      = regexp.MustCompile(`/(\d{5,})-`)
	reMillions = regexp.MustCompile(`(?i)(\d+(?:\.\d+)?)\s*(?:million|m\b)`)
	reBillions = regexp.MustCompile(`(?i)(\d+(?:\.\d+)?)\s*(?:billion|b\b)`)
	reBeds     = regexp.MustCompile(`(?i)(\d+)\s*(?:bed(?:room)?s?|beds?)`)
	reBaths    = regexp.MustCompile(`(?i)(\d+)\s*(?:bath(?:room)?s?|baths?|toilet)`)
	reSqm      = regexp.MustCompile(`(?i)(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*m(?:etre)?s?|sqm)`)
	reSqft     = regexp.MustCompile(`(?i)(\d[\d,]*(?:\.\d+)?)\s*sq\.?\s*f(?:ee)?t`)
	reNumber   = regexp.MustCompile(`[\d,]+(?:\.\d+)?`)
)

// RunPropertyScraper is the main entry point called by the cron job.
// It scrapes NigeriaPropertyCentre.com for all configured states, both for-sale and for-rent.
func RunPropertyScraper() {
	now := time.Now()
	totalFeeds := len(nigerianStates) * 2
	setStatus(func(s *ScraperStatus) {
		*s = ScraperStatus{
			IsRunning:  true,
			StartedAt:  &now,
			TotalFeeds: totalFeeds,
		}
	})
	log.Printf("[Scraper] Starting — %d feeds to process", totalFeeds)

	var total int
	for _, state := range nigerianStates {
		// NPC rental path is "for-rent/<state>". The old "to-let/<state>" now 301-redirects
		// to the unfiltered all-Nigeria listing, so it must not be used.
		for _, feedStatus := range []string{"for-sale", "for-rent"} {
			feed := state.CanonName + " / " + feedStatus
			setStatus(func(s *ScraperStatus) {
				s.CurrentFeed = feed
				s.CurrentPage = 1
			})

			count := scrapeStateStatus(state, feedStatus)
			total += count

			setStatus(func(s *ScraperStatus) {
				s.FeedsComplete++
				s.TotalUpserted = total
			})
			log.Printf("[Scraper] %s → %d upserted (total so far: %d)", feed, count, total)
		}
	}

	done := time.Now()
	setStatus(func(s *ScraperStatus) {
		s.IsRunning = false
		s.CompletedAt = &done
		s.CurrentFeed = ""
		s.TotalUpserted = total
	})
	log.Printf("[Scraper] Completed. %d total listings in %s", total, time.Since(now))
}

func scrapeStateStatus(state stateConfig, status string) int {
	c := colly.NewCollector(
		colly.AllowedDomains("nigeriapropertycentre.com", "www.nigeriapropertycentre.com"),
		colly.UserAgent(scraperUserAgent),
	)

	c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Delay:       1500 * time.Millisecond,
		RandomDelay: 500 * time.Millisecond,
		Parallelism: 1,
	})

	var count int
	var pagesVisited int

	// NPC listing cards — confirmed selector from live HTML inspection
	c.OnHTML("article.group", func(e *colly.HTMLElement) {
		listing := parseListingCard(e, state, status)
		if listing == nil {
			return
		}
		if upsertListing(listing) {
			count++
		}
	})

	// Pagination — NPC uses ?page=N query param
	c.OnHTML("a[href*='?page=']", func(e *colly.HTMLElement) {
		if pagesVisited >= maxPagesPerFeed {
			return
		}
		href := e.Request.AbsoluteURL(e.Attr("href"))
		if href == "" || href == e.Request.URL.String() {
			return
		}
		pagesVisited++
		setStatus(func(s *ScraperStatus) { s.CurrentPage = pagesVisited + 1 })
		e.Request.Visit(href) //nolint:errcheck
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("[Scraper] HTTP error on %s: %v (status %d)", r.Request.URL, err, r.StatusCode)
	})

	seedURL := fmt.Sprintf("https://www.nigeriapropertycentre.com/%s/%s", status, state.Slug)
	if err := c.Visit(seedURL); err != nil {
		log.Printf("[Scraper] Could not visit %s: %v", seedURL, err)
	}

	return count
}

func parseListingCard(e *colly.HTMLElement, state stateConfig, status string) *Models.ScrapedProperty {
	// The whole card is wrapped in an <a class="absolute inset-0 z-10"> overlay
	href := firstNonEmpty(
		e.ChildAttr("a[class*='absolute'][class*='inset-0']", "href"),
		e.ChildAttr("a[href]", "href"),
	)
	absURL := e.Request.AbsoluteURL(href)
	sourceID := extractSourceID(absURL)
	if sourceID == "" {
		return nil
	}

	// Title lives in the only h3 on the card
	title := strings.TrimSpace(e.ChildText("h3"))

	// Price — unique tabular-nums span; fall back to full card text
	priceText := e.ChildText("span[class*='tabular-nums']")
	price, currency := parsePrice(priceText)
	if price <= 0 {
		price, currency = parsePrice(e.Text)
	}
	if price <= 0 {
		return nil
	}

	// Location — the truncate span holds the full address string
	locationText := e.ChildText("span.truncate")
	areaName, stateName := parseLocation(locationText, e.Request.URL.String(), state.CanonName)

	// Beds and baths share the same class; parse from card text using regex
	cardText := e.Text
	beds := parseIntRegex(reBeds, cardText)
	baths := parseIntRegex(reBaths, cardText)

	// Area is not shown on NPC listing cards; attempt extraction from title text
	landAreaSqm := parseSqm(title)

	// Derived fields
	propType := detectPropertyType(title + " " + cardText)
	isPremium := detectPremium(areaName+" "+locationText, state.PremiumAreas)

	listingStatus := "For Sale"
	if strings.Contains(status, "rent") || strings.Contains(status, "let") {
		listingStatus = "For Rent"
	}

	return &Models.ScrapedProperty{
		Source:       "NigeriaPropertyCentre",
		SourceID:     sourceID,
		Title:        truncate(title, 255),
		PropertyType: propType,
		Status:       listingStatus,
		Price:        price,
		Currency:     currency,
		State:        stateName,
		AreaName:     truncate(areaName, 255),
		IsPremium:    isPremium,
		LandAreaSqm:  landAreaSqm,
		Bedrooms:     beds,
		Bathrooms:    baths,
		Url:          truncate(absURL, 500),
		ScrapedAt:    time.Now(),
	}
}

func upsertListing(listing *Models.ScrapedProperty) bool {
	result := Config.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "source_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"price", "title", "land_area_sqm", "building_area_sqm",
			"bedrooms", "bathrooms", "is_premium", "area_name", "scraped_at",
		}),
	}).Create(listing)

	if result.Error != nil {
		log.Printf("[Scraper] Upsert failed for %s: %v", listing.SourceID, result.Error)
		return false
	}
	return true
}

// — Parsing helpers —

func extractSourceID(rawURL string) string {
	if m := rePID.FindStringSubmatch(rawURL); len(m) > 1 {
		return "NPC-" + m[1]
	}
	if rawURL == "" {
		return ""
	}
	sum := md5.Sum([]byte(rawURL))
	return fmt.Sprintf("NPC-%x", sum)[:20]
}

func parsePrice(text string) (float64, string) {
	text = strings.TrimSpace(text)
	if text == "" {
		return 0, "NGN"
	}

	currency := "NGN"
	if strings.Contains(text, "$") || strings.Contains(strings.ToUpper(text), "USD") {
		currency = "USD"
	}

	// Handle shorthand: "45 Million", "1.2B"
	if m := reBillions.FindStringSubmatch(text); len(m) > 1 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v * 1_000_000_000, currency
		}
	}
	if m := reMillions.FindStringSubmatch(text); len(m) > 1 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v * 1_000_000, currency
		}
	}

	// Strip everything except digits and decimal point
	raw := reNumber.FindString(strings.ReplaceAll(text, ",", ""))
	if raw == "" {
		return 0, currency
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || v < 10_000 { // less than ₦10,000 is noise
		return 0, currency
	}
	return v, currency
}

func parseLocation(text, requestURL, fallbackState string) (area, state string) {
	text = strings.TrimSpace(text)

	// "Area, State" is the most common format on NPC
	if idx := strings.LastIndex(text, ","); idx > 0 {
		area = strings.TrimSpace(text[:idx])
		state = normalizeState(strings.TrimSpace(text[idx+1:]))
	}

	if state == "" {
		state = fallbackState
	}

	// If area still missing, derive from the URL path segment
	// e.g. https://www.nigeriapropertycentre.com/for-sale/lagos/lekki
	if area == "" {
		parts := strings.Split(requestURL, "/")
		for i, p := range parts {
			if (p == "for-sale" || p == "to-let") && i+2 < len(parts) {
				raw := parts[i+2]
				raw = strings.ReplaceAll(strings.Split(raw, "?")[0], "-", " ")
				area = toTitleCase(raw)
				break
			}
		}
	}
	return
}

func normalizeState(raw string) string {
	lower := strings.ToLower(raw)
	switch {
	case strings.Contains(lower, "lagos"):
		return "Lagos"
	case strings.Contains(lower, "abuja") || strings.Contains(lower, "fct"):
		return "FCT - Abuja"
	case strings.Contains(lower, "rivers") || strings.Contains(lower, "port harcourt"):
		return "Rivers"
	case strings.Contains(lower, "oyo"):
		return "Oyo"
	case strings.Contains(lower, "ogun"):
		return "Ogun"
	case strings.Contains(lower, "delta"):
		return "Delta"
	case strings.Contains(lower, "anambra"):
		return "Anambra"
	case strings.Contains(lower, "enugu"):
		return "Enugu"
	case strings.Contains(lower, "kano"):
		return "Kano"
	case strings.Contains(lower, "edo"):
		return "Edo"
	case strings.Contains(lower, "kwara"):
		return "Kwara"
	case strings.Contains(lower, "kaduna"):
		return "Kaduna"
	case strings.Contains(lower, "ondo"):
		return "Ondo"
	case strings.Contains(lower, "osun"):
		return "Osun"
	case strings.Contains(lower, "ekiti"):
		return "Ekiti"
	case strings.Contains(lower, "cross river"):
		return "Cross River"
	case strings.Contains(lower, "akwa ibom"):
		return "Akwa Ibom"
	case strings.Contains(lower, "abia"):
		return "Abia"
	case strings.Contains(lower, "imo"):
		return "Imo"
	case strings.Contains(lower, "benue"):
		return "Benue"
	case strings.Contains(lower, "plateau"):
		return "Plateau"
	case strings.Contains(lower, "bauchi"):
		return "Bauchi"
	case strings.Contains(lower, "niger"):
		return "Niger"
	case strings.Contains(lower, "kogi"):
		return "Kogi"
	case strings.Contains(lower, "nassarawa") || strings.Contains(lower, "nasarawa"):
		return "Nassarawa"
	case strings.Contains(lower, "taraba"):
		return "Taraba"
	case strings.Contains(lower, "adamawa"):
		return "Adamawa"
	case strings.Contains(lower, "borno"):
		return "Borno"
	case strings.Contains(lower, "yobe"):
		return "Yobe"
	case strings.Contains(lower, "gombe"):
		return "Gombe"
	case strings.Contains(lower, "zamfara"):
		return "Zamfara"
	case strings.Contains(lower, "kebbi"):
		return "Kebbi"
	case strings.Contains(lower, "sokoto"):
		return "Sokoto"
	case strings.Contains(lower, "jigawa"):
		return "Jigawa"
	case strings.Contains(lower, "katsina"):
		return "Katsina"
	case strings.Contains(lower, "ebonyi"):
		return "Ebonyi"
	case strings.Contains(lower, "bayelsa"):
		return "Bayelsa"
	}
	return raw
}

func detectPropertyType(text string) string {
	lower := strings.ToLower(text)
	switch {
	case strings.Contains(lower, " land") || strings.Contains(lower, "plot") ||
		strings.Contains(lower, "land for"):
		return "Land"
	case strings.Contains(lower, "office") || strings.Contains(lower, " shop") ||
		strings.Contains(lower, "warehouse") || strings.Contains(lower, "commercial") ||
		strings.Contains(lower, "plaza") || strings.Contains(lower, "mall") ||
		strings.Contains(lower, "factory"):
		return "Commercial"
	case strings.Contains(lower, "apartment") || strings.Contains(lower, " flat") ||
		strings.Contains(lower, "studio") || strings.Contains(lower, "self contain"):
		return "Apartment"
	default:
		return "House"
	}
}

func detectPremium(locationText string, premiumAreas []string) bool {
	lower := strings.ToLower(locationText)
	for _, area := range premiumAreas {
		if strings.Contains(lower, strings.ToLower(area)) {
			return true
		}
	}
	return false
}

func parseSqm(text string) float64 {
	if m := reSqm.FindStringSubmatch(text); len(m) > 1 {
		cleaned := strings.ReplaceAll(m[1], ",", "")
		if v, err := strconv.ParseFloat(cleaned, 64); err == nil && v > 0 {
			return v
		}
	}
	if m := reSqft.FindStringSubmatch(text); len(m) > 1 {
		cleaned := strings.ReplaceAll(m[1], ",", "")
		if v, err := strconv.ParseFloat(cleaned, 64); err == nil && v > 0 {
			return v * 0.092903
		}
	}
	return 0
}

func parseIntRegex(re *regexp.Regexp, text string) int {
	if m := re.FindStringSubmatch(text); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil {
			return v
		}
	}
	return 0
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if s := strings.TrimSpace(v); s != "" {
			return s
		}
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

func toTitleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}
