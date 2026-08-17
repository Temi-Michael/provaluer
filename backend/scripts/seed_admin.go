//go:build ignore

package main

import (
	"flag"
	"fmt"
	"log"

	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"

	"github.com/joho/godotenv"
)

func main() {
	email := flag.String("email", "", "Admin email address")
	password := flag.String("password", "", "Admin password")
	name := flag.String("name", "Super Admin", "Admin full name")

	flag.Parse()

	if *email == "" || *password == "" {
		log.Fatal("Usage: go run scripts/seed_admin.go -email admin@provaluer.com -password securepass [-name 'John Doe']")
	}

	godotenv.Load() // Ignore error, it will just use default envs

	fmt.Println("Connecting to Database...")
	Config.ConnectDB()

	// Force migration to guarantee tables exist
	fmt.Println("Migrating Admin Tables...")
	Config.DB.AutoMigrate(&Models.AdminUser{}, &Models.AdminSession{})

	// Hash password with Argon2
	hash, err := Helpers.HashPasswordArgon2(*password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	admin := Models.AdminUser{
		FullName:     *name,
		Email:        *email,
		PasswordHash: hash,
		Role:         "SuperAdmin",
		IsActive:     true,
	}

	if err := Config.DB.Create(&admin).Error; err != nil {
		log.Fatalf("Failed to create admin user (email might already exist): %v", err)
	}

	fmt.Printf("Successfully created SuperAdmin account for %s\n", *email)
}
