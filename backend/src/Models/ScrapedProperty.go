package Models

import (
	"time"
	"github.com/google/uuid"
)

type ScrapedProperty struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Source          string    `gorm:"type:varchar(100);index" json:"source"`       // e.g. "NigeriaPropertyCentre", "PropertyPro"
	SourceID        string    `gorm:"type:varchar(255);uniqueIndex" json:"source_id"` // Unique identifier from original portal to prevent duplicates
	Title           string    `gorm:"type:varchar(255)" json:"title"`
	PropertyType    string    `gorm:"type:varchar(50);index" json:"property_type"` // e.g. "House", "Apartment", "Land", "Commercial"
	Status          string    `gorm:"type:varchar(50);index" json:"status"`        // e.g. "For Sale", "For Rent"
	Price           float64   `gorm:"type:decimal(20,2);index" json:"price"`
	Currency        string    `gorm:"type:varchar(10);default:'NGN'" json:"currency"`
	State           string    `gorm:"type:varchar(100);index" json:"state"`        // e.g. "Lagos", "FCT - Abuja"
	AreaName        string    `gorm:"type:varchar(255);index" json:"area_name"`    // e.g. "Lekki Phase 1", "Maitama"
	IsPremium       bool      `gorm:"default:false;index" json:"is_premium"`       // High-end neighborhood flag
	LandAreaSqm     float64   `gorm:"index" json:"land_area_sqm"`
	BuildingAreaSqm float64   `gorm:"index" json:"building_area_sqm"`
	Bedrooms        int       `json:"bedrooms"`
	Bathrooms       int       `json:"bathrooms"`
	Url             string    `gorm:"type:text" json:"url"`
	ScrapedAt       time.Time `gorm:"index" json:"scraped_at"`
}
