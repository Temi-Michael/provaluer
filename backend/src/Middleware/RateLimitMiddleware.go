package Middleware

import (
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
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

// trustedProxyHops is how many reverse proxies sit between the client and this
// server. Render puts exactly one load balancer in front, which is the default.
//
// This must not be guessed. X-Forwarded-For is client-supplied and every proxy
// APPENDS the address that connected to it, so the list reads:
//
//	<spoofable client input>, <ip seen by proxy 1>, ..., <ip seen by proxy N>
//
// Only the last N entries are written by infrastructure we trust. Reading the
// leftmost entry — the common mistake — lets any caller forge a fresh identity
// per request and bypass rate limiting entirely. Counting back from the right
// by the number of trusted hops yields the real peer.
//
// Set TRUSTED_PROXY_HOPS=0 when the server is exposed directly, so
// X-Forwarded-For is ignored and only the real connection address is used.
var trustedProxyHops = resolveTrustedProxyHops()

func resolveTrustedProxyHops() int {
	if raw := os.Getenv("TRUSTED_PROXY_HOPS"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			return n
		}
		log.Printf("WARNING: invalid TRUSTED_PROXY_HOPS=%q — defaulting to 1", raw)
	}
	return 1
}

// clientIP resolves the address used as the rate-limit bucket key.
func clientIP(r *http.Request) string {
	peer, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		peer = r.RemoteAddr
	}

	if trustedProxyHops == 0 {
		return peer
	}

	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded == "" {
		return peer
	}

	parts := strings.Split(forwarded, ",")
	idx := len(parts) - trustedProxyHops
	if idx < 0 || idx >= len(parts) {
		// Fewer entries than expected means the header did not come through the
		// full trusted chain; fall back to the connection address.
		return peer
	}

	candidate := strings.TrimSpace(parts[idx])
	// Reject anything that is not a real IP so malformed headers cannot create
	// unbounded distinct keys in the client map.
	if net.ParseIP(candidate) == nil {
		return peer
	}
	return candidate
}

// RateLimit wraps an http.Handler with IP-based rate limiting.
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)

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
