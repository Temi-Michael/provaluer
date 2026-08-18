package Helpers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Transactional email is sent through Brevo's HTTP API rather than SMTP.
// Render (and most PaaS providers) block outbound SMTP ports 25/465/587 to
// prevent spam, so a direct SMTP dial times out. HTTPS on 443 is never blocked.
const (
	brevoEndpoint = "https://api.brevo.com/v3/smtp/email"

	// Brevo rejects payloads over ~10MB. Guard before spending a round-trip on
	// a request that cannot succeed. Base64 inflates bytes by ~4/3.
	maxAttachmentBytes = 7 << 20 // 7 MiB raw -> ~9.3 MiB encoded

	sendTimeout = 15 * time.Second
	maxAttempts = 3
)

// Shared client so TLS connections are pooled across sends. The timeout is the
// important part: these calls run in goroutines, and without it a stalled
// connection would leak one indefinitely.
var mailClient = &http.Client{Timeout: sendTimeout}

// AppBaseURL returns the public URL of the deployed frontend, used to build
// links in emails and post-verification redirects. Falls back to local dev.
// Set APP_URL to your Vercel origin in production, e.g. https://provaluer.vercel.app
func AppBaseURL() string {
	if u := strings.TrimRight(os.Getenv("APP_URL"), "/"); u != "" {
		return u
	}
	return "http://localhost:3000"
}

// mockEnabled reports whether email should be logged instead of sent.
// EMAIL_MOCK is the current name; SMTP_MOCK is still honoured so existing
// deployments keep working. Unset means mock, so a misconfigured environment
// never silently mails real users.
func mockEnabled() bool {
	v := os.Getenv("EMAIL_MOCK")
	if v == "" {
		v = os.Getenv("SMTP_MOCK")
	}
	return v != "false"
}

// Email content templates live in EmailTemplates.go. They are parsed once at
// startup and render through html/template, so user-supplied values such as
// display names are contextually escaped and cannot inject markup.

// — Brevo API payload —

type brevoContact struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type brevoAttachment struct {
	Content string `json:"content"` // base64-encoded
	Name    string `json:"name"`
}

type brevoPayload struct {
	Sender      brevoContact      `json:"sender"`
	To          []brevoContact    `json:"to"`
	Subject     string            `json:"subject"`
	HTMLContent string            `json:"htmlContent"`
	Attachment  []brevoAttachment `json:"attachment,omitempty"`
}

// sendEmail is the single transport used by every outbound message. It handles
// mock mode, configuration checks, the HTTP call and bounded retries.
// Callers run this in a goroutine; it never panics and only reports via logs.
func sendEmail(toEmail, toName, subject, htmlBody string, pdf []byte) {
	if mockEnabled() {
		log.Printf("\n========== MOCK EMAIL TO: %s ==========\nSubject: %s\n%s\n%s============================================\n",
			toEmail, subject, htmlBody, attachmentNote(pdf))
		return
	}

	apiKey := os.Getenv("BREVO_API_KEY")
	senderEmail := os.Getenv("BREVO_SENDER_EMAIL")
	if apiKey == "" || senderEmail == "" {
		log.Printf("[Mail] BREVO_API_KEY/BREVO_SENDER_EMAIL not configured — email not sent to %s", toEmail)
		return
	}
	senderName := os.Getenv("BREVO_SENDER_NAME")
	if senderName == "" {
		senderName = "Provaluer"
	}

	payload := brevoPayload{
		Sender:      brevoContact{Name: senderName, Email: senderEmail},
		To:          []brevoContact{{Email: toEmail, Name: toName}},
		Subject:     subject,
		HTMLContent: htmlBody,
	}

	if len(pdf) > 0 {
		if len(pdf) > maxAttachmentBytes {
			// Send the message without the attachment rather than losing it entirely.
			log.Printf("[Mail] Attachment for %s is %d bytes, over the %d limit — sending without it",
				toEmail, len(pdf), maxAttachmentBytes)
		} else {
			payload.Attachment = []brevoAttachment{{
				Content: base64.StdEncoding.EncodeToString(pdf),
				Name:    "Provaluer_Report.pdf",
			}}
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[Mail] Failed to encode payload for %s: %v", toEmail, err)
		return
	}

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		retryable, err := postToBrevo(body, apiKey, toEmail)
		if err == nil {
			return
		}
		if !retryable || attempt == maxAttempts {
			log.Printf("[Mail] Giving up on %s after %d attempt(s): %v", toEmail, attempt, err)
			return
		}
		// Linear backoff — enough to ride out a brief blip without holding the
		// goroutine open for long.
		time.Sleep(time.Duration(attempt) * time.Second)
	}
}

// postToBrevo performs one send attempt. It reports whether the failure is
// worth retrying (network error, 429, or 5xx) versus terminal (4xx config error).
func postToBrevo(body []byte, apiKey, toEmail string) (retryable bool, err error) {
	req, err := http.NewRequest(http.MethodPost, brevoEndpoint, bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	req.Header.Set("api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := mailClient.Do(req)
	if err != nil {
		return true, err // network/timeout — worth another try
	}
	defer resp.Body.Close()

	// Read a bounded amount so a hostile or broken response cannot balloon memory,
	// and drain the rest so the connection can be reused.
	snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusAccepted {
		log.Printf("[Mail] Sent to %s", toEmail)
		return false, nil
	}

	// The response body is Brevo's error detail (e.g. unverified sender, quota
	// exceeded). It never contains our API key, which is header-only.
	err = fmt.Errorf("brevo returned %d: %s", resp.StatusCode, strings.TrimSpace(string(snippet)))
	retryable = resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500
	return retryable, err
}

func attachmentNote(pdf []byte) string {
	if len(pdf) == 0 {
		return ""
	}
	return fmt.Sprintf("[Attachment: Provaluer_Report.pdf, %d bytes]\n", len(pdf))
}

// — Public API —
//
// Each function is safe to call in a goroutine: they never panic and report
// problems through the log rather than returning errors.

// VerificationLinkTTLHours is surfaced in the verification email so the copy
// stays in step with the token lifetime enforced in AuthController.
const VerificationLinkTTLHours = 48

// SendWelcomeEmail sends the account verification link.
func SendWelcomeEmail(toEmail string, name string, token string) {
	link := fmt.Sprintf("%s/api/auth/verify?token=%s", AppBaseURL(), token)

	html, err := render(verificationContent, struct {
		Name        string
		Link        string
		Button      template.HTML
		ExpiryHours int
	}{
		Name:        name,
		Link:        link,
		Button:      button(link, "Verify My Account"),
		ExpiryHours: VerificationLinkTTLHours,
	}, "Verify your account", "Confirm your email to start valuing properties.")

	if err != nil {
		log.Printf("[Mail] Failed to render verification email for %s: %v", toEmail, err)
		return
	}
	sendEmail(toEmail, name, "Verify your Provaluer account", html, nil)
}

// ReportEmail carries the context shown alongside an attached valuation report.
type ReportEmail struct {
	ToEmail        string
	Name           string
	ModelType      string
	PropertyType   string
	State          string
	EstimatedValue float64
	Confidence     int
	PDF            []byte
}

// SendReportEmail delivers a valuation report. A nil or empty PDF sends the
// summary with no attachment.
func SendReportEmail(d ReportEmail) {
	html, err := render(reportContent, struct {
		ReportEmail
		Button template.HTML
	}{
		ReportEmail: d,
		Button:      button(AppBaseURL()+"/models", "View in Dashboard"),
	}, "Your valuation report is ready", "Your Provaluer valuation report is attached.")

	if err != nil {
		log.Printf("[Mail] Failed to render report email for %s: %v", d.ToEmail, err)
		return
	}
	sendEmail(d.ToEmail, d.Name, "Your Provaluer valuation report is ready", html, d.PDF)
}

// RentReminderEmail is sent to a tenant ahead of a rent due date.
type RentReminderEmail struct {
	ToEmail         string
	TenantName      string
	PropertyTitle   string
	PropertyAddress string
	RentAmount      float64
	Currency        string
	DueDate         time.Time
	DaysUntilDue    int
}

// SendRentReminderEmail notifies a tenant that rent is coming due.
func SendRentReminderEmail(d RentReminderEmail) {
	html, err := render(rentReminderContent, d,
		"Rent payment reminder",
		fmt.Sprintf("Your rent of %s is due in %d days.", FormatMoney(d.RentAmount, d.Currency), d.DaysUntilDue))

	if err != nil {
		log.Printf("[Mail] Failed to render rent reminder for %s: %v", d.ToEmail, err)
		return
	}
	sendEmail(d.ToEmail, d.TenantName, "Rent payment reminder", html, nil)
}

// SubscriptionEmail confirms a plan change.
type SubscriptionEmail struct {
	ToEmail      string
	Name         string
	PlanTier     string
	MonthlyLimit int
	// Downgrade switches the copy from congratulatory to neutral.
	Downgrade bool
}

// SendSubscriptionChangeEmail confirms an upgrade, downgrade or admin override.
func SendSubscriptionChangeEmail(d SubscriptionEmail) {
	headline := "Your plan has been upgraded"
	intro := fmt.Sprintf("you now have access to the %s plan. Here's what's included:", d.PlanTier)
	subject := "Your Provaluer plan has been upgraded"

	if d.Downgrade {
		headline = "Your plan has been updated"
		intro = fmt.Sprintf("your account has been moved to the %s plan. Here are your current limits:", d.PlanTier)
		subject = "Your Provaluer plan has been updated"
	}

	html, err := render(subscriptionContent, struct {
		SubscriptionEmail
		Headline string
		Intro    string
		Button   template.HTML
	}{
		SubscriptionEmail: d,
		Headline:          headline,
		Intro:             intro,
		Button:            button(AppBaseURL()+"/subscription/mine", "View My Plan"),
	}, headline, intro)

	if err != nil {
		log.Printf("[Mail] Failed to render subscription email for %s: %v", d.ToEmail, err)
		return
	}
	sendEmail(d.ToEmail, d.Name, subject, html, nil)
}
