package Middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type client struct {
	limiter  *rateLimiter
	lastSeen time.Time
}

type rateLimiter struct {
	tokens     float64
	maxTokens  float64
	refillRate float64 // tokens per second
	lastRefill time.Time
	mu         sync.Mutex
}

func newRateLimiter(maxTokens float64, refillRate float64) *rateLimiter {
	return &rateLimiter{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (rl *rateLimiter) allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRefill).Seconds()
	rl.lastRefill = now

	rl.tokens += elapsed * rl.refillRate
	if rl.tokens > rl.maxTokens {
		rl.tokens = rl.maxTokens
	}

	if rl.tokens >= 1.0 {
		rl.tokens -= 1.0
		return true
	}
	return false
}

var (
	clientsMu sync.Mutex
	clients   = make(map[string]*client)
)

func init() {
	// Background cleanup goroutine to prevent memory leak
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			clientsMu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > 30*time.Minute {
					delete(clients, ip)
				}
			}
			clientsMu.Unlock()
		}
	}()
}

// RateLimit wraps an http.Handler with IP-based rate limiting.
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}

		clientsMu.Lock()
		c, exists := clients[ip]
		if !exists {
			// Max 60 tokens, refilled at 2 tokens/sec (120/min limit with burst allowance)
			c = &client{
				limiter: newRateLimiter(60, 2),
			}
			clients[ip] = c
		}
		c.lastSeen = time.Now()
		clientsMu.Unlock()

		if !c.limiter.allow() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"success":false,"error":"Too many requests. Please try again later."}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}
