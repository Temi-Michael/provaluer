//go:build ignore

package main

import (
	"encoding/json"
	"fmt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("/Users/cog/Desktop/provaluer/backend/provaluer.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	var users []map[string]interface{}
	db.Table("users").Limit(1).Find(&users)

	b, _ := json.MarshalIndent(users, "", "  ")
	fmt.Println(string(b))
}
