package Models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	FullName     string    `gorm:"type:varchar(255)"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	PhoneNumber  string    `gorm:"type:varchar(50)"`
	PasswordHash string    `gorm:"not null"`
	Role         string    `gorm:"type:varchar(50);default:'User'"`
	ApiKeyToken        string    `gorm:"type:text"` // AES Encrypted
	PortfolioCurrency  string    `gorm:"type:varchar(10);default:'NGN'"`
	ExchangeRate       float64   `gorm:"default:1400"`
	IsVerified         bool      `gorm:"default:false"`
	VerificationToken  string    `gorm:"type:varchar(255)"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
	Subscriptions      []Subscription `gorm:"foreignKey:UserID"`
}

type AdminUser struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	FullName     string    `gorm:"type:varchar(255)"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	PasswordHash string    `gorm:"not null"` // Argon2id hash
	Role         string    `gorm:"type:varchar(50);default:'Moderator'"` // SuperAdmin, Moderator
	LastLoginIP  string    `gorm:"type:varchar(45)"`
	IsActive     bool      `gorm:"default:true"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type AdminSession struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AdminID   uuid.UUID `gorm:"type:uuid;not null;index"`
	TokenHash string    `gorm:"type:varchar(255);uniqueIndex;not null"` // SHA256 of the token
	UserAgent string    `gorm:"type:text"`
	IPAddress string    `gorm:"type:varchar(45)"`
	ExpiresAt time.Time
	CreatedAt time.Time

	AdminUser AdminUser `gorm:"foreignKey:AdminID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type AdminConfig struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Key         string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	Value       string    `gorm:"type:text"` // AES Encrypted
	Description string    `gorm:"type:text"`
	UpdatedAt   time.Time
}

// MaterialCostConfig stores admin-managed construction material prices and build rates.
// The valuation engine reads "build_rate_*" keys to drive the Cost Model.
type MaterialCostConfig struct {
	ID        uint      `json:"id" gorm:"primarykey;autoIncrement"`
	Key       string    `json:"key" gorm:"type:varchar(100);uniqueIndex;not null"`
	Label     string    `json:"label" gorm:"type:varchar(200);not null"`
	Category  string    `json:"category" gorm:"type:varchar(100);not null"`
	Value     float64   `json:"value" gorm:"not null;default:0"`
	Unit      string    `json:"unit" gorm:"type:varchar(50)"`
	UpdatedAt time.Time `json:"updated_at"`
}

// StateRate stores admin-managed land and building rates per state and tier.
// The valuation engine reads these instead of the old hardcoded staticRates().
// "Default" is a special state used as the catch-all when no specific row exists.
type StateRate struct {
	ID                 uint      `json:"id" gorm:"primarykey;autoIncrement"`
	State              string    `json:"state" gorm:"type:varchar(100);not null;uniqueIndex:idx_state_premium"`
	IsPremium          bool      `json:"is_premium" gorm:"not null;default:false;uniqueIndex:idx_state_premium"`
	LandRatePerSqm     float64   `json:"land_rate_per_sqm" gorm:"not null;default:0"`
	BuildingRatePerSqm float64   `json:"building_rate_per_sqm" gorm:"not null;default:0"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type MarketRate struct {
	ID                       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Date                     time.Time `gorm:"type:date;index"`
	State                    string    `gorm:"type:varchar(100);index"`
	IsPremium                bool      `gorm:"default:false;index"` // For premium environments like Lekki, Port-Harcourt
	AvgRentPerSqm            float64
	AvgSalePerSqm            float64
	ConstructionCostPerSqm   float64
	CementPrice              float64
	SteelPrice               float64
	CreatedAt                time.Time
}

type Property struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID           uuid.UUID `gorm:"type:uuid;index"`
	Type             string    `gorm:"type:varchar(50)"`
	State            string    `gorm:"type:varchar(100)"`
	IsPremium        bool      `gorm:"default:false"`
	TitleDocument    string    `gorm:"type:text"` // AES Encrypted if sensitive
	LandAreaSqm      float64
	BuildingAreaSqm  float64
	Condition        string    `gorm:"type:varchar(50)"`
	CreatedAt        time.Time
	UpdatedAt        time.Time

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type ValuationModel struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID           uuid.UUID `gorm:"type:uuid;index"`
	PropertyID       uuid.UUID `gorm:"type:uuid;index"`
	MarketRateID     *uuid.UUID `gorm:"type:uuid"`
	ModelType        string    `gorm:"type:varchar(50)"` // Comparable, Income, Cost, DCF
	Inputs           string    `gorm:"type:jsonb"`
	EstimatedValue   float64
	ConfidenceScore  int
	CreatedAt        time.Time

	User       User       `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Property   Property   `gorm:"foreignKey:PropertyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	MarketRate MarketRate `gorm:"foreignKey:MarketRateID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

type Subscription struct {
	ID                  uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID              uuid.UUID `gorm:"type:uuid;index"`
	PlanTier            string    `gorm:"type:varchar(50)"` // Starter, Professional, Enterprise
	MonthlyLimit        int       `gorm:"default:5"`
	ModelsUsedThisMonth int       `gorm:"default:0"`
	CustomAgencyName    string    `gorm:"type:varchar(100)"` // For Enterprise
	CustomBrandColor    string    `gorm:"type:varchar(7)"`   // For Enterprise (e.g. #FF5733)
	CustomLogo          string    `gorm:"type:text"`         // For Enterprise (URL or base64)
	CustomFont          string    `gorm:"type:varchar(50)"`  // For Enterprise
	PaystackCustomerID  string    `gorm:"type:varchar(255)"`
	StripeCustomerID    string    `gorm:"type:varchar(255)"`
	ExpiresAt           time.Time
	IsActive            bool      `gorm:"default:true"`
	CreatedAt           time.Time
	UpdatedAt           time.Time

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID `gorm:"type:uuid;not null"`
	Amount        float64   `gorm:"not null"`
	Currency      string    `gorm:"type:varchar(10);default:'NGN'"`
	Status        string    `gorm:"type:varchar(50);default:'Pending'"` // Pending, Success, Failed
	Gateway       string    `gorm:"type:varchar(50)"` // Paystack, Stripe
	TransactionID string    `gorm:"type:varchar(255)"` // Gateway's transaction reference
	CreatedAt     time.Time
	UpdatedAt     time.Time

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func Migrate(db *gorm.DB) error {
	// Enable uuid-ossp if not exists
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
	
	// Drop old non-cascading constraints so GORM recreates them
	db.Exec("ALTER TABLE properties DROP CONSTRAINT IF EXISTS fk_properties_user;")
	db.Exec("ALTER TABLE valuation_models DROP CONSTRAINT IF EXISTS fk_valuation_models_user;")
	db.Exec("ALTER TABLE valuation_models DROP CONSTRAINT IF EXISTS fk_valuation_models_property;")
	db.Exec("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_user;")
	db.Exec("ALTER TABLE portfolio_properties DROP CONSTRAINT IF EXISTS fk_portfolio_properties_user;")
	db.Exec("ALTER TABLE tenants DROP CONSTRAINT IF EXISTS fk_tenants_user;")
	db.Exec("ALTER TABLE leases DROP CONSTRAINT IF EXISTS fk_leases_property;")
	db.Exec("ALTER TABLE leases DROP CONSTRAINT IF EXISTS fk_leases_tenant;")
	db.Exec("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_property;")
	db.Exec("ALTER TABLE maintenance_logs DROP CONSTRAINT IF EXISTS fk_maintenance_logs_property;")

	// Auto Migrate existing models + Payment
	return db.AutoMigrate(
		&User{},
		&AdminUser{},
		&AdminSession{},
		&AdminConfig{},
		&Property{},
		&MarketRate{},
		&ValuationModel{},
		&Subscription{},
		&Payment{},
		&PortfolioProperty{},
		&Tenant{},
		&Lease{},
		&Transaction{},
		&MaintenanceLog{},
		&ScrapedProperty{},
	)
}
