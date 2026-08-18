package Helpers

import (
	"html/template"
	"strings"
	"testing"
	"time"
)

// hostileName is user-controlled input that must never reach the rendered body
// unescaped, in any template.
const hostileName = `<script>alert('xss')</script>`

func TestAllTemplatesEscapeUserSuppliedNames(t *testing.T) {
	cases := []struct {
		name   string
		render func() (string, error)
	}{
		{"verification", func() (string, error) {
			return render(verificationContent, struct {
				Name        string
				Link        string
				Button      template.HTML
				ExpiryHours int
			}{hostileName, "https://example.com/v?token=x", button("https://example.com", "Verify"), 48}, "t", "p")
		}},
		{"report", func() (string, error) {
			return render(reportContent, struct {
				ReportEmail
				Button template.HTML
			}{ReportEmail{Name: hostileName, PropertyType: hostileName, State: "Lagos", EstimatedValue: 1, Confidence: 90}, ""}, "t", "p")
		}},
		{"rent_reminder", func() (string, error) {
			return render(rentReminderContent, RentReminderEmail{
				TenantName: hostileName, PropertyTitle: hostileName,
				RentAmount: 1, Currency: "NGN", DueDate: time.Now(), DaysUntilDue: 7,
			}, "t", "p")
		}},
		{"subscription", func() (string, error) {
			return render(subscriptionContent, struct {
				SubscriptionEmail
				Headline string
				Intro    string
				Button   template.HTML
			}{SubscriptionEmail{Name: hostileName, PlanTier: "Free", MonthlyLimit: 5}, "h", "i", ""}, "t", "p")
		}},
	}

	for _, tc := range cases {
		out, err := tc.render()
		if err != nil {
			t.Fatalf("%s failed to render: %v", tc.name, err)
		}
		if strings.Contains(out, "<script>") {
			t.Errorf("%s did not escape a hostile name", tc.name)
		}
		// Every email must carry the shared brand layout.
		if !strings.Contains(out, "Provaluer") || !strings.Contains(out, "<!DOCTYPE html>") {
			t.Errorf("%s is missing the shared layout", tc.name)
		}
	}
}

func TestFormatMoney(t *testing.T) {
	cases := []struct {
		amount   float64
		currency string
		want     string
	}{
		{185500000, "NGN", "₦185,500,000"},
		{1000, "NGN", "₦1,000"},
		{999, "", "₦999"},
		{0, "NGN", "₦0"},
		{2500.75, "USD", "$2,501"},
		{1234567, "GBP", "£1,234,567"},
		{5000, "ZAR", "ZAR 5,000"},
	}
	for _, c := range cases {
		if got := FormatMoney(c.amount, c.currency); got != c.want {
			t.Errorf("FormatMoney(%v, %q) = %q, want %q", c.amount, c.currency, got, c.want)
		}
	}
}

func TestReportEmailRendersValuationDetail(t *testing.T) {
	out, err := render(reportContent, struct {
		ReportEmail
		Button template.HTML
	}{ReportEmail{
		Name: "Ada", ModelType: "Comparable", PropertyType: "Residential",
		State: "Lagos", EstimatedValue: 185500000, Confidence: 87,
	}, ""}, "t", "p")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"₦185,500,000", "87% confidence", "Comparable", "Lagos", "Residential"} {
		if !strings.Contains(out, want) {
			t.Errorf("report email missing %q", want)
		}
	}
}

func TestRentReminderRendersAmountAndDate(t *testing.T) {
	due := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	out, err := render(rentReminderContent, RentReminderEmail{
		TenantName: "Ada", PropertyTitle: "Lekki Duplex", PropertyAddress: "12 Admiralty Way",
		RentAmount: 4500000, Currency: "NGN", DueDate: due, DaysUntilDue: 7,
	}, "t", "p")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"₦4,500,000", "1 September 2026", "Lekki Duplex", "in 7 days"} {
		if !strings.Contains(out, want) {
			t.Errorf("rent reminder missing %q", want)
		}
	}
	// A tenant must never receive report-email copy (the pre-fix behaviour).
	if strings.Contains(out, "valuation report") {
		t.Error("rent reminder is leaking valuation-report copy")
	}
}

func TestSubscriptionCopyDistinguishesUpgradeFromDowngrade(t *testing.T) {
	up, _ := render(subscriptionContent, struct {
		SubscriptionEmail
		Headline string
		Intro    string
		Button   template.HTML
	}{SubscriptionEmail{Name: "Ada", PlanTier: "Enterprise", MonthlyLimit: 150},
		"Your plan has been upgraded", "you now have access", ""}, "t", "p")

	if !strings.Contains(up, "upgraded") || !strings.Contains(up, "150") {
		t.Error("upgrade email missing headline or limit")
	}
}

func TestMockDefaultsToOnWhenUnset(t *testing.T) {
	t.Setenv("EMAIL_MOCK", "")
	t.Setenv("SMTP_MOCK", "")
	if !mockEnabled() {
		t.Error("unset config must default to mock so real users are never mailed by accident")
	}
}

func TestMockHonoursLegacySMTPMock(t *testing.T) {
	t.Setenv("EMAIL_MOCK", "")
	t.Setenv("SMTP_MOCK", "false")
	if mockEnabled() {
		t.Error("SMTP_MOCK=false must disable mock so existing deployments keep sending")
	}
}

func TestEmailMockOverridesLegacyName(t *testing.T) {
	t.Setenv("EMAIL_MOCK", "false")
	t.Setenv("SMTP_MOCK", "true")
	if mockEnabled() {
		t.Error("EMAIL_MOCK should take precedence over SMTP_MOCK")
	}
}

func TestAppBaseURLTrimsTrailingSlash(t *testing.T) {
	t.Setenv("APP_URL", "https://provaluer.vercel.app/")
	if got := AppBaseURL(); got != "https://provaluer.vercel.app" {
		t.Errorf("AppBaseURL() = %q, want no trailing slash", got)
	}

	t.Setenv("APP_URL", "")
	if got := AppBaseURL(); got != "http://localhost:3000" {
		t.Errorf("AppBaseURL() fallback = %q", got)
	}
}
