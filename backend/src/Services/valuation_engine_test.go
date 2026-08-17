package Services

import (
	"testing"
	"time"

	"provaluer-api/src/Models"
)

// comps builds a comparable set with the given per-sqm prices, scraped today.
func comps(pricesPerSqm ...float64) []Models.ScrapedProperty {
	out := make([]Models.ScrapedProperty, 0, len(pricesPerSqm))
	for _, p := range pricesPerSqm {
		out = append(out, Models.ScrapedProperty{
			Price:       p * 100, // 100 sqm each
			LandAreaSqm: 100,
			ScrapedAt:   time.Now(),
		})
	}
	return out
}

func TestMarketConfidenceRespondsToDataQuality(t *testing.T) {
	tooThin := comps(100000, 110000)
	if _, ok := marketConfidence(tooThin); ok {
		t.Fatal("expected fewer than 3 comparables to be rejected")
	}

	// Tight cluster of many comparables -> high confidence.
	tight := comps(100000, 101000, 99000, 100500, 99500, 100200, 100800, 99800)
	tightConf, ok := marketConfidence(tight)
	if !ok {
		t.Fatal("expected tight comparable set to produce a score")
	}

	// Same sample size, wildly dispersed -> lower confidence.
	loose := comps(40000, 180000, 60000, 150000, 45000, 190000, 70000, 165000)
	looseConf, ok := marketConfidence(loose)
	if !ok {
		t.Fatal("expected dispersed comparable set to produce a score")
	}

	if tightConf <= looseConf {
		t.Errorf("dispersion should reduce confidence: tight=%d loose=%d", tightConf, looseConf)
	}

	// A small set should score below a large one with equal dispersion.
	small := comps(100000, 101000, 99000)
	smallConf, _ := marketConfidence(small)
	if smallConf >= tightConf {
		t.Errorf("larger sample should score higher: small=%d large=%d", smallConf, tightConf)
	}

	for _, c := range []int{tightConf, looseConf, smallConf} {
		if c < minConfidence || c > maxConfidence {
			t.Errorf("confidence %d outside [%d,%d]", c, minConfidence, maxConfidence)
		}
	}
}

func TestStaleComparablesLoseConfidence(t *testing.T) {
	fresh := comps(100000, 101000, 99000, 100500, 99500, 100200)
	stale := comps(100000, 101000, 99000, 100500, 99500, 100200)
	for i := range stale {
		stale[i].ScrapedAt = time.Now().AddDate(0, 0, -200)
	}

	freshConf, _ := marketConfidence(fresh)
	staleConf, _ := marketConfidence(stale)
	if freshConf <= staleConf {
		t.Errorf("stale listings should score lower: fresh=%d stale=%d", freshConf, staleConf)
	}
}

func TestLandUsesServicingNotBuildingCondition(t *testing.T) {
	// Land is scored on servicing/terrain.
	if got := conditionMultiplier("Fully Serviced (Road & Drainage)", "Land"); got != 1.05 {
		t.Errorf("fully serviced land = %v, want 1.05", got)
	}
	if got := conditionMultiplier("Difficult Terrain (Waterlogged)", "Land"); got != 0.55 {
		t.Errorf("waterlogged land = %v, want 0.55", got)
	}

	// Built property keeps the physical-condition scale.
	if got := conditionMultiplier("Excellent (Newly Built)", "Residential"); got != 1.05 {
		t.Errorf("excellent building = %v, want 1.05", got)
	}
	if got := conditionMultiplier("Poor (Dilapidated)", "Residential"); got != 0.45 {
		t.Errorf("poor building = %v, want 0.45", got)
	}

	// Legacy land records that stored a building condition still compute.
	if got := conditionMultiplier("Good (Renovated)", "Land"); got != 0.95 {
		t.Errorf("legacy land condition = %v, want 0.95 fallback", got)
	}
}

func TestClampConfidence(t *testing.T) {
	if got := clampConfidence(5); got != minConfidence {
		t.Errorf("clamp low = %d, want %d", got, minConfidence)
	}
	if got := clampConfidence(500); got != maxConfidence {
		t.Errorf("clamp high = %d, want %d", got, maxConfidence)
	}
	if got := clampConfidence(77); got != 77 {
		t.Errorf("clamp mid = %d, want 77", got)
	}
}
