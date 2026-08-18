package Helpers

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"
	"time"
)

// Email markup targets the lowest common denominator of mail clients: nested
// tables, inline styles, explicit bgcolor attributes, and no external assets
// (many clients block remote images by default, so the wordmark is styled text).

const layoutHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.Title}}</title>
</head>
<body style="margin:0; padding:0; background-color:#0d0d0e;">
  <!-- Inbox preview text, hidden in the rendered body -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">{{.Preheader}}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d0d0e" style="background-color:#0d0d0e; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="display:inline-block; width:32px; height:32px; line-height:32px; background-color:#0a84ff; color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; font-weight:bold; border-radius:8px; text-align:center;">P</span>
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:20px; font-weight:bold; color:#ffffff; vertical-align:middle; padding-left:8px;">Provaluer</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="#1c1c1e" style="background-color:#1c1c1e; border:1px solid #333333; border-radius:12px; padding:40px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#ffffff;">
              {{.Content}}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#666666; line-height:1.6;">
              Provaluer — data-driven property valuation for Nigeria.<br>
              <a href="{{.AppURL}}" style="color:#0a84ff; text-decoration:none;">{{.AppURL}}</a><br>
              <span style="color:#4a4a4a;">&copy; {{.Year}} Provaluer. All rights reserved.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

var layoutTemplate = template.Must(template.New("layout").Parse(layoutHTML))

// renderEmail wraps already-rendered content in the shared brand layout.
// content must come from a template that escaped its own inputs.
func renderEmail(title, preheader string, content template.HTML) (string, error) {
	var out bytes.Buffer
	err := layoutTemplate.Execute(&out, struct {
		Title     string
		Preheader string
		Content   template.HTML
		AppURL    string
		Year      int
	}{
		Title:     title,
		Preheader: preheader,
		Content:   content,
		AppURL:    AppBaseURL(),
		Year:      time.Now().Year(),
	})
	return out.String(), err
}

// render executes a content template then wraps it in the layout.
func render(t *template.Template, data any, title, preheader string) (string, error) {
	var inner bytes.Buffer
	if err := t.Execute(&inner, data); err != nil {
		return "", err
	}
	return renderEmail(title, preheader, template.HTML(inner.String()))
}

// — Shared snippets —

// button renders a bulletproof table-based CTA. The URL is produced by our own
// code (never user input), so it is injected as a trusted attribute value.
func button(url, label string) template.HTML {
	return template.HTML(fmt.Sprintf(
		`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>`+
			`<td bgcolor="#0a84ff" style="background-color:#0a84ff; border-radius:8px;">`+
			`<a href="%s" style="display:inline-block; padding:14px 28px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none;">%s</a>`+
			`</td></tr></table>`, template.HTMLEscapeString(url), template.HTMLEscapeString(label)))
}

// detailRow renders a label/value line inside a summary card. It uses a nested
// two-cell table rather than `float:right` because Outlook's Word-based renderer
// ignores floats, which would collapse the value onto the label.
// The value is escaped, so it is safe with user-supplied content.
func detailRow(label string, value any, divider bool) template.HTML {
	border := ""
	if divider {
		border = " border-bottom:1px solid #2a2a2a;"
	}
	return template.HTML(fmt.Sprintf(
		`<tr><td style="padding:12px 20px;%s">`+
			`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr>`+
			`<td align="left" style="font-size:14px; color:#a0a0a0;">%s</td>`+
			`<td align="right" style="font-size:14px; color:#ffffff; font-weight:600;">%s</td>`+
			`</tr></table></td></tr>`,
		border,
		template.HTMLEscapeString(label),
		template.HTMLEscapeString(fmt.Sprint(value)),
	))
}

var templateFuncs = template.FuncMap{
	"money":     FormatMoney,
	"date":      func(t time.Time) string { return t.Format("2 January 2006") },
	"detailRow": detailRow,
}

func mustParse(name, body string) *template.Template {
	return template.Must(template.New(name).Funcs(templateFuncs).Parse(body))
}

// FormatMoney renders an amount with a currency symbol and thousand separators,
// e.g. FormatMoney(185500000, "NGN") -> "₦185,500,000".
func FormatMoney(amount float64, currency string) string {
	symbol := ""
	switch strings.ToUpper(currency) {
	case "NGN", "":
		symbol = "₦"
	case "USD":
		symbol = "$"
	case "GBP":
		symbol = "£"
	case "EUR":
		symbol = "€"
	default:
		symbol = strings.ToUpper(currency) + " "
	}
	return symbol + withThousandSeparators(amount)
}

func withThousandSeparators(v float64) string {
	s := fmt.Sprintf("%.0f", v)
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")

	var b strings.Builder
	for i, digit := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(digit)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

// — 1. Account verification —

var verificationContent = mustParse("verification", `
<h1 style="margin:0 0 16px; font-size:24px; font-weight:bold; color:#ffffff; text-align:center;">Welcome to Provaluer, {{.Name}}</h1>
<p style="margin:0 0 28px; font-size:16px; line-height:1.6; color:#a0a0a0; text-align:center;">
  You're one step away. Confirm your email address and you can start generating
  institutional-grade property valuations straight away.
</p>
<div style="text-align:center; margin-bottom:28px;">{{.Button}}</div>
<p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:#8a8a8a; text-align:center;">
  Or paste this link into your browser:<br>
  <span style="color:#0a84ff; word-break:break-all;">{{.Link}}</span>
</p>
<p style="margin:24px 0 0; padding-top:20px; border-top:1px solid #333333; font-size:13px; line-height:1.6; color:#666666; text-align:center;">
  This link expires in {{.ExpiryHours}} hours. If you didn't create a Provaluer account, you can safely ignore this email.
</p>`)

// — 2. Valuation report ready —

var reportContent = mustParse("report", `
<h1 style="margin:0 0 16px; font-size:22px; font-weight:bold; color:#ffffff;">Your valuation report is ready</h1>
<p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#a0a0a0;">
  Hi {{.Name}}, the report you requested is attached as a PDF. Here's the summary:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px; border:1px solid #333333; border-radius:8px;">
  <tr>
    <td style="padding:20px; text-align:center; border-bottom:1px solid #333333;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#8a8a8a; margin-bottom:6px;">Estimated Value</div>
      <div style="font-size:30px; font-weight:bold; color:#ffffff;">{{money .EstimatedValue "NGN"}}</div>
      <div style="font-size:13px; color:#30d158; margin-top:6px;">{{.Confidence}}% confidence</div>
    </td>
  </tr>
  {{if .PropertyType}}{{detailRow "Property Type" .PropertyType true}}{{end}}
  {{if .State}}{{detailRow "Location" .State true}}{{end}}
  {{if .ModelType}}{{detailRow "Methodology" .ModelType false}}{{end}}
</table>

<div style="text-align:center; margin-bottom:24px;">{{.Button}}</div>
<p style="margin:0; font-size:13px; line-height:1.6; color:#666666; text-align:center;">
  Valuations are data-driven estimates based on current market listings, not a
  substitute for a certified physical appraisal.
</p>`)

// — 3. Rent reminder —

var rentReminderContent = mustParse("rent_reminder", `
<h1 style="margin:0 0 16px; font-size:22px; font-weight:bold; color:#ffffff;">Rent payment reminder</h1>
<p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#a0a0a0;">
  Hi {{.TenantName}}, this is a friendly reminder that your rent payment is due
  in {{.DaysUntilDue}} days.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px; border:1px solid #333333; border-radius:8px;">
  <tr>
    <td style="padding:20px; text-align:center; border-bottom:1px solid #333333;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#8a8a8a; margin-bottom:6px;">Amount Due</div>
      <div style="font-size:30px; font-weight:bold; color:#ffffff;">{{money .RentAmount .Currency}}</div>
      <div style="font-size:13px; color:#ff9f0a; margin-top:6px;">Due {{date .DueDate}}</div>
    </td>
  </tr>
  {{if .PropertyTitle}}{{detailRow "Property" .PropertyTitle true}}{{end}}
  {{if .PropertyAddress}}{{detailRow "Address" .PropertyAddress false}}{{end}}
</table>

<p style="margin:0; padding-top:20px; border-top:1px solid #333333; font-size:13px; line-height:1.6; color:#666666; text-align:center;">
  If you've already paid, please disregard this reminder. Questions about your
  tenancy should go to your property manager.
</p>`)

// — 4. Subscription change —

var subscriptionContent = mustParse("subscription", `
<h1 style="margin:0 0 16px; font-size:22px; font-weight:bold; color:#ffffff;">{{.Headline}}</h1>
<p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#a0a0a0;">
  Hi {{.Name}}, {{.Intro}}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px; border:1px solid #333333; border-radius:8px;">
  <tr>
    <td style="padding:20px; text-align:center; border-bottom:1px solid #333333;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#8a8a8a; margin-bottom:6px;">Current Plan</div>
      <div style="font-size:28px; font-weight:bold; color:#ffffff;">{{.PlanTier}}</div>
    </td>
  </tr>
  {{detailRow "Monthly valuations" .MonthlyLimit false}}
</table>

<div style="text-align:center; margin-bottom:24px;">{{.Button}}</div>
<p style="margin:0; font-size:13px; line-height:1.6; color:#666666; text-align:center;">
  Your usage counter resets on the first of each month.
</p>`)
