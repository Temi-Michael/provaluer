package Middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"provaluer-api/src/Config"
	"provaluer-api/src/Helpers"
	"provaluer-api/src/Models"
	"strings"
	"time"
)

func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Unauthorized - Missing or invalid token", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := Helpers.VerifyJWT(tokenString)
		if err != nil {
			http.Error(w, "Unauthorized - Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", claims["user_id"])
		ctx = context.WithValue(ctx, "role", claims["role"])
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"success":false,"error":"Unauthorized - Missing admin token"}`, http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		
		// Hash the token to look it up securely in the DB
		hash := sha256.Sum256([]byte(tokenString))
		tokenHash := hex.EncodeToString(hash[:])

		var session Models.AdminSession
		if err := Config.DB.Preload("AdminUser").Where("token_hash = ?", tokenHash).First(&session).Error; err != nil {
			http.Error(w, `{"success":false,"error":"Unauthorized - Invalid or expired session"}`, http.StatusUnauthorized)
			return
		}

		if time.Now().After(session.ExpiresAt) || !session.AdminUser.IsActive {
			// Cleanup expired session
			Config.DB.Delete(&session)
			http.Error(w, `{"success":false,"error":"Unauthorized - Session expired or account disabled"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "admin_session_id", session.ID)
		ctx = context.WithValue(ctx, "admin_user_id", session.AdminUser.ID)
		ctx = context.WithValue(ctx, "admin_role", session.AdminUser.Role)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
