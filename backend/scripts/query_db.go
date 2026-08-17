//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
	"encoding/json"
)

func main() {
	db, err := sql.Open("sqlite3", "/Users/cog/Desktop/provaluer/backend/provaluer.db")
	if err != nil {
		panic(err)
	}

	rows, err := db.Query("SELECT id, full_name, email, role FROM users LIMIT 1")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, fullName, email, role string
		rows.Scan(&id, &fullName, &email, &role)
		users = append(users, map[string]interface{}{
			"ID": id,
			"FullName": fullName,
			"Email": email,
			"Role": role,
		})
	}
	b, _ := json.MarshalIndent(users, "", "  ")
	fmt.Println(string(b))
}
