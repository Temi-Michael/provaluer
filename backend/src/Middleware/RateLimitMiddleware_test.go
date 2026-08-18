package Middleware

import (
	"net/http"
	"testing"
)

func request(remoteAddr, forwarded string) *http.Request {
	r := &http.Request{RemoteAddr: remoteAddr, Header: http.Header{}}
	if forwarded != "" {
		r.Header.Set("X-Forwarded-For", forwarded)
	}
	return r
}

// With one trusted proxy (Render's default), the real client is the last entry —
// anything to its left was supplied by the caller and must be ignored.
func TestClientIPIgnoresSpoofedPrefix(t *testing.T) {
	trustedProxyHops = 1
	defer func() { trustedProxyHops = 1 }()

	cases := []struct {
		name      string
		forwarded string
		want      string
	}{
		{"single real client", "203.0.113.7", "203.0.113.7"},
		{"spoofed prefix", "1.2.3.4, 203.0.113.7", "203.0.113.7"},
		{"many spoofed entries", "9.9.9.9, 8.8.8.8, 7.7.7.7, 203.0.113.7", "203.0.113.7"},
		{"whitespace tolerated", "1.2.3.4 ,   203.0.113.7  ", "203.0.113.7"},
		{"ipv6 client", "1.2.3.4, 2001:db8::1", "2001:db8::1"},
	}

	for _, c := range cases {
		got := clientIP(request("10.0.0.5:54321", c.forwarded))
		if got != c.want {
			t.Errorf("%s: clientIP() = %q, want %q", c.name, got, c.want)
		}
	}
}

// An attacker rotating the spoofable portion must keep landing in the same
// bucket, otherwise rate limiting can be bypassed outright.
func TestSpoofedHeaderCannotRotateBucket(t *testing.T) {
	trustedProxyHops = 1
	defer func() { trustedProxyHops = 1 }()

	first := clientIP(request("10.0.0.5:1", "1.1.1.1, 203.0.113.7"))
	second := clientIP(request("10.0.0.5:2", "2.2.2.2, 203.0.113.7"))
	third := clientIP(request("10.0.0.5:3", "3.3.3.3, 4.4.4.4, 203.0.113.7"))

	if first != second || second != third {
		t.Errorf("rotating spoofed prefixes produced different buckets: %q, %q, %q", first, second, third)
	}
}

// Direct exposure: the header must be ignored entirely.
func TestClientIPIgnoresHeaderWhenNotProxied(t *testing.T) {
	trustedProxyHops = 0
	defer func() { trustedProxyHops = 1 }()

	if got := clientIP(request("203.0.113.9:1234", "1.2.3.4")); got != "203.0.113.9" {
		t.Errorf("clientIP() = %q, want the real peer 203.0.113.9", got)
	}
}

// Malformed or truncated headers must fall back to the connection address
// rather than becoming map keys.
func TestClientIPFallsBackOnBadHeaders(t *testing.T) {
	trustedProxyHops = 2
	defer func() { trustedProxyHops = 1 }()

	// Only one entry but two hops expected — chain is not as configured.
	if got := clientIP(request("10.0.0.5:1", "203.0.113.7")); got != "10.0.0.5" {
		t.Errorf("short chain: got %q, want fallback 10.0.0.5", got)
	}

	trustedProxyHops = 1
	if got := clientIP(request("10.0.0.5:1", "not-an-ip")); got != "10.0.0.5" {
		t.Errorf("garbage value: got %q, want fallback 10.0.0.5", got)
	}
	if got := clientIP(request("10.0.0.5:1", "")); got != "10.0.0.5" {
		t.Errorf("empty header: got %q, want fallback 10.0.0.5", got)
	}
}

func TestTwoHopChain(t *testing.T) {
	trustedProxyHops = 2
	defer func() { trustedProxyHops = 1 }()

	// client, seen-by-CDN, seen-by-LB -> real client is second from the right.
	if got := clientIP(request("10.0.0.5:1", "1.2.3.4, 203.0.113.7, 198.51.100.2")); got != "203.0.113.7" {
		t.Errorf("two-hop: got %q, want 203.0.113.7", got)
	}
}
