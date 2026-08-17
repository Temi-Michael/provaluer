package Routes

import (
	"net/http"
	"provaluer-api/src/Controllers"
	"provaluer-api/src/Middleware"
	"strings"

)

func RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/register", Controllers.RegisterUser)
	mux.HandleFunc("/api/auth/login", Controllers.LoginUser)
	mux.HandleFunc("/api/auth/verify", Controllers.VerifyAccount)
	
	// Protected Profile Routes
	mux.HandleFunc("/api/profile/api-key", Middleware.RequireAuth(Controllers.GenerateAPIKey))
	mux.HandleFunc("/api/profile/preferences", Middleware.RequireAuth(Controllers.UpdateProfilePreferences))
	mux.HandleFunc("/api/profile/account", Middleware.RequireAuth(Controllers.DeleteAccount))
	
	// Protected Subscription Routes
	mux.HandleFunc("/api/subscription/mine", Middleware.RequireAuth(Controllers.GetMySubscription))
	mux.HandleFunc("/api/subscription/upgrade", Middleware.RequireAuth(Controllers.UpgradeSubscription))
	mux.HandleFunc("/api/subscription/enterprise-settings", Middleware.RequireAuth(Controllers.UpdateEnterpriseSettings))

	// Marketplace Route (Public & Internal)
	mux.HandleFunc("/api/marketplace", Controllers.GetMarketplaceProperties)

	// Protected Models Routes
	mux.HandleFunc("/api/models", Middleware.RequireAuth(Controllers.GetMyModels))
	
	mux.HandleFunc("/api/models/", Middleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/export/pdf") {
			Controllers.ExportValuationPDF(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/export/email") {
			Controllers.EmailValuationPDF(w, r)
		} else if r.Method == http.MethodGet {
			Controllers.GetModelByID(w, r)
		} else {
			http.Error(w, "Not found", http.StatusNotFound)
		}
	}))
	
	// Protected Valuation Routes
	mux.HandleFunc("/api/valuation/create", Middleware.RequireAuth(Controllers.CreateValuation))
	mux.HandleFunc("/api/valuation/rates", Middleware.RequireAuth(Controllers.GetValuationRates))
	mux.HandleFunc("/api/valuation/preview", Middleware.RequireAuth(Controllers.PreviewValuation))

	// Portfolio & Rent Automation Routes
	mux.HandleFunc("/api/portfolio/valuate", Middleware.RequireAuth(Controllers.RunPortfolioValuation))

	mux.HandleFunc("/api/portfolio/properties", Middleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			Controllers.AddPortfolioProperty(w, r)
		} else {
			Controllers.GetPortfolioProperties(w, r)
		}
	}))
	
	mux.HandleFunc("/api/portfolio/tenants", Middleware.RequireAuth(Controllers.CreateTenant))
	mux.HandleFunc("/api/portfolio/leases", Middleware.RequireAuth(Controllers.CreateLease))
	
	mux.HandleFunc("/api/portfolio/", Middleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/portfolio/") {
			Controllers.GetPropertyDetails(w, r)
		}
	}))

	mux.HandleFunc("/api/portfolio/transactions", Middleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			Controllers.AddTransaction(w, r)
		} else {
			Controllers.GetTransactions(w, r)
		}
	}))

	// Intelligence
	mux.HandleFunc("/api/intelligence", Middleware.RequireAuth(Controllers.GetMarketIntelligence))

	// Testing Cron (Protected by strict admin check)
	mux.HandleFunc("/api/cron/test-rent-reminders", Middleware.RequireAdmin(Controllers.TestRentReminders))
	mux.HandleFunc("/api/cron/trigger-scraper", Middleware.RequireAdmin(Controllers.TriggerScraper))
	mux.HandleFunc("/api/cron/scraper-status", Middleware.RequireAdmin(Controllers.GetScraperStatus))

	// --- ISOLATED ADMIN API (v1) ---
	
	// Admin Auth (Public)
	mux.HandleFunc("/api/admin/auth/login", Controllers.AdminLogin)

	// Admin Dashboard (Protected by strict Session Check)
	mux.Handle("/api/admin/stats", Middleware.RequireAdmin(http.HandlerFunc(Controllers.GetStatsAdmin)))
	mux.Handle("/api/admin/users", Middleware.RequireAdmin(http.HandlerFunc(Controllers.GetUsersAdmin)))
	mux.Handle("/api/admin/users/subscription", Middleware.RequireAdmin(http.HandlerFunc(Controllers.OverrideSubscriptionAdmin)))
	mux.Handle("/api/admin/auth/logout", Middleware.RequireAdmin(http.HandlerFunc(Controllers.AdminLogout)))
	mux.Handle("/api/admin/market-data/stats", Middleware.RequireAdmin(http.HandlerFunc(Controllers.GetMarketDataStatsAdmin)))
	mux.Handle("/api/admin/market-data", Middleware.RequireAdmin(http.HandlerFunc(Controllers.GetMarketDataAdmin)))
	mux.Handle("/api/admin/state-rates", Middleware.RequireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			Controllers.UpdateStateRatesAdmin(w, r)
		} else {
			Controllers.GetStateRatesAdmin(w, r)
		}
	})))

	mux.Handle("/api/admin/material-costs", Middleware.RequireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			Controllers.UpdateMaterialCostsAdmin(w, r)
		} else {
			Controllers.GetMaterialCostsAdmin(w, r)
		}
	})))
}
