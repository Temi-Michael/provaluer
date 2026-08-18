package Controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
	"provaluer-api/src/Services"
)

// ResetMonthlyUsage resets the ModelsUsedThisMonth to 0 for all users.
// This is typically called by a cron job on the 1st of every month.
func ResetMonthlyUsage() {
	log.Println("Running ResetMonthlyUsage Cron Job...")
	result := Config.DB.Model(&Models.Subscription{}).Where("1 = 1").Update("models_used_this_month", 0)
	if result.Error != nil {
		log.Printf("Error resetting monthly usage: %v\n", result.Error)
		return
	}
	log.Printf("Successfully reset monthly usage for %d subscriptions.\n", result.RowsAffected)
}

// rentReminderLeadDays is how far ahead of the due date tenants are notified.
const rentReminderLeadDays = 7

// CheckUpcomingRent queries leases due in exactly rentReminderLeadDays and sends reminders.
func CheckUpcomingRent() {
	log.Println("Running CheckUpcomingRent Cron Job...")

	now := time.Now()
	targetDate := time.Date(now.Year(), now.Month(), now.Day()+rentReminderLeadDays, 0, 0, 0, 0, now.Location())
	
	var leases []Models.Lease
	if err := Config.DB.Preload("Property").Preload("Tenant").Where("DATE(next_due_date) = DATE(?) AND is_active = ?", targetDate, true).Find(&leases).Error; err != nil {
		log.Printf("Error finding upcoming leases: %v\n", err)
		return
	}

	for _, lease := range leases {
		if lease.Tenant.Email == "" {
			continue
		}
		Helpers.SendRentReminderEmail(Helpers.RentReminderEmail{
			ToEmail:         lease.Tenant.Email,
			TenantName:      lease.Tenant.FullName,
			PropertyTitle:   lease.Property.Title,
			PropertyAddress: lease.Property.Address,
			RentAmount:      lease.RentAmount,
			Currency:        lease.Currency,
			DueDate:         lease.NextDueDate,
			DaysUntilDue:    rentReminderLeadDays,
		})
		log.Printf("Sent rent reminder to %s for property %s\n", lease.Tenant.Email, lease.Property.Title)
	}
	log.Printf("Processed %d rent reminders.\n", len(leases))
}

// TestRentReminders is an endpoint to manually trigger the rent reminder logic
func TestRentReminders(w http.ResponseWriter, r *http.Request) {
	CheckUpcomingRent()
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "success", "message": "Triggered rent reminders cron job"}`))
}

// TriggerScraper is a protected admin endpoint that starts a scraper run immediately.
func TriggerScraper(w http.ResponseWriter, r *http.Request) {
	go Services.RunPropertyScraper()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": "Property scraper started in background",
	})
}

// GetScraperStatus returns the live progress of the running (or last completed) scraper job.
func GetScraperStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	status := Services.GetScraperStatus()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    status,
	})
}

// StartCronJobs initializes all background scheduled tasks.
func StartCronJobs() {
	// Daily midnight tasks: rent reminders + monthly usage reset
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			time.Sleep(time.Until(next))

			CheckUpcomingRent()
			CleanupUnverifiedAccounts()

			if time.Now().Day() == 1 {
				ResetMonthlyUsage()
			}
		}
	}()

	// Sweep expired unverified accounts once at boot so a redeploy doesn't wait
	// until midnight to clear a backlog.
	go CleanupUnverifiedAccounts()

	// Property scraper — runs daily at 02:00 AM
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day(), 2, 0, 0, 0, now.Location())
			if !now.Before(next) {
				next = next.Add(24 * time.Hour)
			}
			time.Sleep(time.Until(next))
			log.Println("[Cron] 02:00 AM — starting property scraper")
			Services.RunPropertyScraper()
		}
	}()
}
