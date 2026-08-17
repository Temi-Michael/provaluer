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

	var models []map[string]interface{}
	db.Table("valuation_models").Limit(1).Find(&models)

	b, _ := json.MarshalIndent(models, "", "  ")
	fmt.Println(string(b))
}
