package Helpers

import (
	"encoding/json"
	"net/http"
)

// JSONError sends a standard JSON error response to prevent plain-text leakage
func JSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
