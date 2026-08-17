package Models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PortfolioProperty struct {
	ID               uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID           uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	OwnerName        string         `gorm:"type:varchar(255)" json:"owner_name"` // Useful for agencies managing for others
	Title            string         `gorm:"type:varchar(255);not null" json:"title"`
	Description      string         `gorm:"type:text" json:"description"`
	PropertyType     string         `gorm:"type:varchar(100)" json:"property_type"` // Residential, Commercial, etc.
	Status           string         `gorm:"type:varchar(50);default:'Personal'" json:"status"` // Rented, Personal, For Sale, Vacant
	Address          string         `gorm:"type:text" json:"address"`
	City             string         `gorm:"type:varchar(100)" json:"city"`
	State            string         `gorm:"type:varchar(100)" json:"state"`
	Country          string         `gorm:"type:varchar(100);default:'Nigeria'" json:"country"`
	
	// Robust features
	LandAreaSqm      float64        `json:"land_area_sqm"`
	BuildingAreaSqm  float64        `json:"building_area_sqm"`
	Bedrooms         int            `json:"bedrooms"`
	Bathrooms        int            `json:"bathrooms"`
	Condition        string         `gorm:"type:varchar(100)" json:"condition"`
	YearBuilt        int            `json:"year_built"`
	Amenities        string         `gorm:"type:text" json:"amenities"` // JSON string of amenities

	// Purchase & Valuation
	PurchasePrice    float64        `json:"purchase_price"`
	PurchaseCurrency string         `gorm:"type:varchar(10);default:'NGN'" json:"purchase_currency"`
	PurchaseDate     *time.Time     `json:"purchase_date"`
	CurrentValue     float64        `json:"current_value"` // Automatically updated by valuation engine
	
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}

type Tenant struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	FullName    string         `gorm:"type:varchar(255);not null" json:"full_name"`
	Email       string         `gorm:"type:varchar(255)" json:"email"`
	PhoneNumber string         `gorm:"type:varchar(50)" json:"phone_number"`
	Occupation  string         `gorm:"type:varchar(255)" json:"occupation"`
	Notes       string         `gorm:"type:text" json:"notes"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}

type Lease struct {
	ID               uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PropertyID       uuid.UUID      `gorm:"type:uuid;not null" json:"property_id"`
	TenantID         uuid.UUID      `gorm:"type:uuid;not null" json:"tenant_id"`
	StartDate        time.Time      `json:"start_date"`
	EndDate          time.Time      `json:"end_date"`
	RentAmount       float64        `json:"rent_amount"`
	Currency         string         `gorm:"type:varchar(10);default:'NGN'" json:"currency"`
	PaymentFrequency string         `gorm:"type:varchar(50)" json:"payment_frequency"` // Monthly, Yearly
	NextDueDate      time.Time      `json:"next_due_date"`
	SecurityDeposit  float64        `json:"security_deposit"`
	IsActive         bool           `gorm:"default:true" json:"is_active"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`

	Property PortfolioProperty `gorm:"foreignKey:PropertyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Tenant   Tenant            `gorm:"foreignKey:TenantID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}

type Transaction struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PropertyID  uuid.UUID      `gorm:"type:uuid;not null" json:"property_id"`
	LeaseID     *uuid.UUID     `gorm:"type:uuid" json:"lease_id"` // Optional, if related to a tenant
	Type        string         `gorm:"type:varchar(50);not null" json:"type"` // INCOME, EXPENSE
	Category    string         `gorm:"type:varchar(100)" json:"category"` // Rent, Maintenance, Tax, Service Charge, Agent Fee
	Amount      float64        `json:"amount"`
	Currency    string         `gorm:"type:varchar(10);default:'NGN'" json:"currency"`
	Date        time.Time      `json:"date"`
	Description string         `gorm:"type:text" json:"description"`
	ReceiptURL  string         `gorm:"type:text" json:"receipt_url"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`

	Property PortfolioProperty `gorm:"foreignKey:PropertyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Lease    *Lease            `gorm:"foreignKey:LeaseID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"-"`
}

type MaintenanceLog struct {
	ID                 uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PropertyID         uuid.UUID      `gorm:"type:uuid;not null" json:"property_id"`
	Title              string         `gorm:"type:varchar(255);not null" json:"title"`
	Description        string         `gorm:"type:text" json:"description"`
	Status             string         `gorm:"type:varchar(50);default:'Pending'" json:"status"` // Pending, In Progress, Completed
	AmountSpent        float64        `json:"amount_spent"`
	Currency           string         `gorm:"type:varchar(10);default:'NGN'" json:"currency"`
	MaterialsPurchased string         `gorm:"type:text" json:"materials_purchased"` // List of materials
	VendorName         string         `gorm:"type:varchar(255)" json:"vendor_name"`
	DateReported       time.Time      `json:"date_reported"`
	DateResolved       *time.Time     `json:"date_resolved"`
	InvoiceURL         string         `gorm:"type:text" json:"invoice_url"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`

	Property PortfolioProperty `gorm:"foreignKey:PropertyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}
