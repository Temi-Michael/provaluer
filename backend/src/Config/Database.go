package Config

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"provaluer-api/src/Models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// newDBLogger configures GORM's query logger.
//
// GORM's default logger inlines every bound parameter into the logged SQL and
// logs any statement slower than 200ms. Against a managed database that
// threshold is crossed routinely by ordinary network latency, so password
// hashes, verification tokens and other sensitive column values end up in
// plain text in the platform logs.
//
// ParameterizedQueries replaces those values with placeholders ($1, $2, ...),
// which keeps slow-query and error diagnostics useful without leaking data.
// It is on unless DB_LOG_PARAMS=true is set explicitly for local debugging.
func newDBLogger() logger.Interface {
	level := logger.Warn
	switch strings.ToLower(os.Getenv("DB_LOG_LEVEL")) {
	case "silent":
		level = logger.Silent
	case "error":
		level = logger.Error
	case "warn":
		level = logger.Warn
	case "info":
		level = logger.Info
	}

	// Opt-in only, and never worth enabling on a deployed environment.
	redactParams := strings.ToLower(os.Getenv("DB_LOG_PARAMS")) != "true"
	if !redactParams {
		log.Println("WARNING: DB_LOG_PARAMS=true — SQL parameter values will be written to logs. Do not use in production.")
	}

	return logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			// A remote managed database makes 200ms unremarkable; 1s indicates
			// a query actually worth investigating.
			SlowThreshold:             time.Second,
			LogLevel:                  level,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      redactParams,
			Colorful:                  false, // platform log viewers render ANSI codes as noise
		},
	)
}

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback for local development
		dsn = "host=localhost user=postgres password=postgres dbname=provaluer port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: newDBLogger()})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connection successfully established")
	DB = db

	err = DB.AutoMigrate(
		&Models.User{},
		&Models.Subscription{},
		&Models.Property{},
		&Models.ValuationModel{},
		&Models.MarketRate{},
		// Portfolio CRM Models
		&Models.PortfolioProperty{},
		&Models.Tenant{},
		&Models.Lease{},
		&Models.Transaction{},
		&Models.MaintenanceLog{},
		// Scraper data
		&Models.ScrapedProperty{},
		// Admin-managed cost config
		&Models.MaterialCostConfig{},
		&Models.StateRate{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	fmt.Println("Database migration completed")
	seedMaterialCosts(db)
	seedStateRates(db)
}

func seedStateRates(db *gorm.DB) {
	defaults := []Models.StateRate{
		{State: "Lagos",       IsPremium: false, LandRatePerSqm: 120000, BuildingRatePerSqm: 280000},
		{State: "Lagos",       IsPremium: true,  LandRatePerSqm: 420000, BuildingRatePerSqm: 616000},
		{State: "FCT - Abuja", IsPremium: false, LandRatePerSqm: 100000, BuildingRatePerSqm: 250000},
		{State: "FCT - Abuja", IsPremium: true,  LandRatePerSqm: 350000, BuildingRatePerSqm: 550000},
		{State: "Rivers",      IsPremium: false, LandRatePerSqm: 70000,  BuildingRatePerSqm: 200000},
		{State: "Rivers",      IsPremium: true,  LandRatePerSqm: 245000, BuildingRatePerSqm: 440000},
		{State: "Oyo",         IsPremium: false, LandRatePerSqm: 40000,  BuildingRatePerSqm: 160000},
		{State: "Oyo",         IsPremium: true,  LandRatePerSqm: 140000, BuildingRatePerSqm: 352000},
		{State: "Ogun",        IsPremium: false, LandRatePerSqm: 40000,  BuildingRatePerSqm: 160000},
		{State: "Ogun",        IsPremium: true,  LandRatePerSqm: 140000, BuildingRatePerSqm: 352000},
		{State: "Delta",       IsPremium: false, LandRatePerSqm: 30000,  BuildingRatePerSqm: 140000},
		{State: "Delta",       IsPremium: true,  LandRatePerSqm: 105000, BuildingRatePerSqm: 308000},
		{State: "Anambra",     IsPremium: false, LandRatePerSqm: 30000,  BuildingRatePerSqm: 140000},
		{State: "Anambra",     IsPremium: true,  LandRatePerSqm: 105000, BuildingRatePerSqm: 308000},
		{State: "Enugu",       IsPremium: false, LandRatePerSqm: 30000,  BuildingRatePerSqm: 140000},
		{State: "Enugu",       IsPremium: true,  LandRatePerSqm: 105000, BuildingRatePerSqm: 308000},
		{State: "Kano",        IsPremium: false, LandRatePerSqm: 25000,  BuildingRatePerSqm: 120000},
		{State: "Kano",        IsPremium: true,  LandRatePerSqm: 87500,  BuildingRatePerSqm: 264000},
		{State: "Kaduna",      IsPremium: false, LandRatePerSqm: 25000,  BuildingRatePerSqm: 120000},
		{State: "Kaduna",      IsPremium: true,  LandRatePerSqm: 87500,  BuildingRatePerSqm: 264000},
		{State: "Edo",         IsPremium: false, LandRatePerSqm: 35000,  BuildingRatePerSqm: 150000},
		{State: "Edo",         IsPremium: true,  LandRatePerSqm: 120000, BuildingRatePerSqm: 330000},
		{State: "Default",     IsPremium: false, LandRatePerSqm: 25000,  BuildingRatePerSqm: 120000},
		{State: "Default",     IsPremium: true,  LandRatePerSqm: 87500,  BuildingRatePerSqm: 264000},
	}
	for _, d := range defaults {
		db.Where(Models.StateRate{State: d.State, IsPremium: d.IsPremium}).FirstOrCreate(&d)
	}
}

func seedMaterialCosts(db *gorm.DB) {
	defaults := []Models.MaterialCostConfig{
		// Raw Materials
		{Key: "cement_per_bag",        Label: "Cement (50kg bag)",          Category: "Raw Materials", Value: 12000,   Unit: "₦/bag"},
		{Key: "iron_rod_per_tonne",    Label: "Iron Rod / Steel",            Category: "Raw Materials", Value: 900000,  Unit: "₦/tonne"},
		{Key: "sand_per_trip",         Label: "Sharp Sand (5-tonne trip)",   Category: "Raw Materials", Value: 60000,   Unit: "₦/trip"},
		{Key: "granite_per_trip",      Label: "Granite / Gravel (trip)",     Category: "Raw Materials", Value: 80000,   Unit: "₦/trip"},
		{Key: "hollow_block_per_unit", Label: "Hollow Block (9-inch)",       Category: "Raw Materials", Value: 700,     Unit: "₦/block"},
		// Labour
		{Key: "labour_per_sqm",        Label: "All-in Labour Rate",          Category: "Labour",        Value: 45000,   Unit: "₦/sqm"},
		{Key: "finishing_per_sqm",     Label: "Finishing & Tiling",          Category: "Labour",        Value: 35000,   Unit: "₦/sqm"},
		{Key: "roofing_per_sqm",       Label: "Roofing (sheet + labour)",    Category: "Labour",        Value: 28000,   Unit: "₦/sqm"},
		// Build Rates — used directly by the Cost Model
		{Key: "build_rate_standard",   Label: "Standard Residential Build",  Category: "Build Rates",   Value: 250000,  Unit: "₦/sqm"},
		{Key: "build_rate_premium",    Label: "Premium Residential Build",   Category: "Build Rates",   Value: 500000,  Unit: "₦/sqm"},
		{Key: "build_rate_commercial", Label: "Commercial Build",            Category: "Build Rates",   Value: 350000,  Unit: "₦/sqm"},
		// Rent Rates — fallback used by Income/DCF models when no rent comparables exist
		{Key: "rent_rate_standard",    Label: "Standard Annual Rent",        Category: "Rent Rates",    Value: 15000,   Unit: "₦/sqm/yr"},
		{Key: "rent_rate_premium",     Label: "Premium Annual Rent",         Category: "Rent Rates",    Value: 45000,   Unit: "₦/sqm/yr"},
	}
	for _, d := range defaults {
		db.Where(Models.MaterialCostConfig{Key: d.Key}).FirstOrCreate(&d)
	}
}
