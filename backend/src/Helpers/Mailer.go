package Helpers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
)

// Email template for welcome and verification
const welcomeEmailTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d0e; color: #ffffff; margin: 0; padding: 40px 20px;">
  <div style="max-w-[600px] margin: 0 auto; background-color: #1c1c1e; border: 1px solid #333; border-radius: 12px; padding: 40px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Welcome to Provaluer, {{.Name}}!</h1>
    <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
      We're thrilled to have you on board. Provaluer is your ultimate automated property valuation tool. 
      Before you can dive in and generate your first report, please verify your email address.
    </p>
    <a href="{{.VerificationLink}}" style="display: inline-block; background-color: #0a84ff; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 8px; font-size: 16px; margin-bottom: 30px;">
      Verify My Account
    </a>
    <p style="color: #666; font-size: 13px; border-top: 1px solid #333; padding-top: 20px;">
      If you did not request this account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
`

func SendWelcomeEmail(toEmail string, name string, token string) {
	verificationLink := fmt.Sprintf("http://localhost:3000/api/auth/verify?token=%s", token)

	data := struct {
		Name             string
		VerificationLink string
	}{
		Name:             name,
		VerificationLink: verificationLink,
	}

	t, err := template.New("welcome").Parse(welcomeEmailTemplate)
	if err != nil {
		log.Printf("Failed to parse email template: %v", err)
		return
	}

	var body bytes.Buffer
	err = t.Execute(&body, data)
	if err != nil {
		log.Printf("Failed to execute email template: %v", err)
		return
	}

	// For local development mock
	mockMode := os.Getenv("SMTP_MOCK")
	if mockMode == "true" || mockMode == "" {
		log.Printf("\n========== MOCK EMAIL TO: %s ==========\n%s\n============================================\n", toEmail, body.String())
		return
	}

	// Real SMTP implementation
	host := os.Getenv("SMTP_HOST") // e.g. smtp.gmail.com
	port := os.Getenv("SMTP_PORT") // e.g. 587
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" || user == "" || pass == "" {
		log.Printf("SMTP credentials not fully configured. Email not sent to %s", toEmail)
		return
	}

	auth := smtp.PlainAuth("", user, pass, host)

	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: Welcome to Provaluer - Verify your account\r\n%s\r\n%s", toEmail, headers, body.String()))

	err = smtp.SendMail(host+":"+port, auth, user, []string{toEmail}, msg)
	if err != nil {
		log.Printf("Failed to send email to %s via SMTP: %v", toEmail, err)
	} else {
		log.Printf("Email successfully sent to %s via SMTP", toEmail)
	}
}

func SendReportEmail(toEmail, name string, pdfBytes []byte) {
	mock := os.Getenv("SMTP_MOCK")
	if mock == "true" {
		fmt.Printf("\n========== MOCK EMAIL TO: %s ==========\n", toEmail)
		fmt.Println("Subject: Your Provaluer Report is Ready!")
		fmt.Println("[Attachment: Provaluer_Report.pdf included]")
		fmt.Printf("============================================\n")
		return
	}

	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" || user == "" || pass == "" {
		log.Printf("SMTP credentials not fully configured. Email not sent to %s", toEmail)
		return
	}

	auth := smtp.PlainAuth("", user, pass, host)

	// Since we are adding an attachment, we need to construct a multipart email.
	boundary := "provaluer-boundary-1234567890"

	var body bytes.Buffer
	body.WriteString(fmt.Sprintf("To: %s\r\n", toEmail))
	body.WriteString("Subject: Your Provaluer Report is Ready!\r\n")
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n", boundary))
	body.WriteString("\r\n")

	// Text part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
	body.WriteString("\r\n")
	body.WriteString(fmt.Sprintf("<p>Hi %s,</p><p>Please find attached your requested automated valuation report.</p><p>Best,<br>Provaluer Team</p>\r\n", name))
	body.WriteString("\r\n")

	// Attachment part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: application/pdf; name=\"Provaluer_Report.pdf\"\r\n")
	body.WriteString("Content-Disposition: attachment; filename=\"Provaluer_Report.pdf\"\r\n")
	body.WriteString("Content-Transfer-Encoding: base64\r\n")
	body.WriteString("\r\n")

	encoded := base64.StdEncoding.EncodeToString(pdfBytes)
	
	// Add base64 payload in chunks of 76 characters per RFC 2045
	for i := 0; i < len(encoded); i += 76 {
		end := i + 76
		if end > len(encoded) {
			end = len(encoded)
		}
		body.WriteString(encoded[i:end] + "\r\n")
	}

	body.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	err := smtp.SendMail(host+":"+port, auth, user, []string{toEmail}, body.Bytes())
	if err != nil {
		log.Printf("Failed to send report to %s via SMTP: %v", toEmail, err)
	} else {
		log.Printf("Report successfully sent to %s via SMTP", toEmail)
	}
}
