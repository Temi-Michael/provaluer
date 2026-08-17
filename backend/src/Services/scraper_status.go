package Services

import (
	"sync"
	"time"
)

// ScraperStatus holds live progress of the running scraper.
// Safe to read from any goroutine via GetScraperStatus.
type ScraperStatus struct {
	IsRunning     bool       `json:"is_running"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	CurrentFeed   string     `json:"current_feed"`
	CurrentPage   int        `json:"current_page"`
	TotalFeeds    int        `json:"total_feeds"`
	FeedsComplete int        `json:"feeds_complete"`
	TotalUpserted int        `json:"total_upserted"`
	LastError     string     `json:"last_error"`
}

var (
	statusMu      sync.RWMutex
	scraperState  ScraperStatus
)

func GetScraperStatus() ScraperStatus {
	statusMu.RLock()
	defer statusMu.RUnlock()
	return scraperState
}

func setStatus(fn func(*ScraperStatus)) {
	statusMu.Lock()
	defer statusMu.Unlock()
	fn(&scraperState)
}
