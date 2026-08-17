package Helpers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"provaluer-api/src/Models"
)

func formatCommas(num float64) string {
	str := fmt.Sprintf("%.2f", num)
	parts := strings.Split(str, ".")
	integerPart := parts[0]
	fractionalPart := ""
	if len(parts) > 1 {
		fractionalPart = "." + parts[1]
	}

	var result []rune
	length := len(integerPart)
	for i, r := range integerPart {
		if i > 0 && (length-i)%3 == 0 && integerPart[i-1] != '-' {
			result = append(result, ',')
		}
		result = append(result, r)
	}
	return string(result) + fractionalPart
}

func generateHTML(model Models.ValuationModel, sub Models.Subscription) string {
	brandName := "PROVALUER"
	brandColor := "#0a84ff"
	fontFamily := "Arial, sans-serif"
	googleFontUrl := ""
	letterheadCSS := ""
	contentMargin := "40px"

	if sub.PlanTier == "Enterprise" {
		if sub.CustomAgencyName != "" {
			brandName = sub.CustomAgencyName
		}
		if sub.CustomBrandColor != "" {
			brandColor = sub.CustomBrandColor
		}
		if sub.CustomFont != "" && sub.CustomFont != "Default (System)" {
			fontFamily = fmt.Sprintf("'%s', sans-serif", sub.CustomFont)
			fontUrlSafe := strings.ReplaceAll(sub.CustomFont, " ", "+")
			googleFontUrl = fmt.Sprintf(`<link href="https://fonts.googleapis.com/css2?family=%s:wght@400;600;700&display=swap" rel="stylesheet">`, fontUrlSafe)
		}
		if sub.CustomLogo != "" {
			letterheadCSS = fmt.Sprintf(`
				body {
					background-image: url('%s');
					background-size: cover;
					background-position: center top;
					background-repeat: no-repeat;
				}
				.report-container {
					background: rgba(255, 255, 255, 0.85);
					backdrop-filter: blur(10px);
					border-radius: 16px;
					padding: 40px;
					margin-top: 150px;
					box-shadow: 0 10px 40px rgba(0,0,0,0.05);
				}
				.header-brand {
					display: none;
				}
			`, sub.CustomLogo)
			contentMargin = "0"
		}
	}

	currency := "NGN"
	if model.User.PortfolioCurrency != "" {
		currency = model.User.PortfolioCurrency
	}

	dateStr := time.Now().Format("January 02, 2006")

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	%s
	<style>
		html { -webkit-print-color-adjust: exact; }
		body {
			font-family: %s;
			margin: 0;
			padding: %s;
			color: #1c1c1e;
			background-color: #ffffff;
			min-height: 100vh;
		}
		%s
		
		.header {
			text-align: center;
			margin-bottom: 40px;
		}
		.brand-name {
			font-size: 32px;
			font-weight: 700;
			color: %s;
			text-transform: uppercase;
			letter-spacing: 2px;
			margin-bottom: 10px;
		}
		.report-title {
			font-size: 18px;
			color: #666;
			margin-bottom: 30px;
		}
		.section {
			margin-bottom: 30px;
			border: 1px solid #e5e5ea;
			border-radius: 12px;
			overflow: hidden;
			background: #fff;
		}
		.section-title {
			background-color: #f5f5f7;
			padding: 15px 20px;
			font-size: 16px;
			font-weight: 700;
			border-bottom: 1px solid #e5e5ea;
			color: #1c1c1e;
		}
		.grid-2 {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.grid-item {
			padding: 15px 20px;
			border-bottom: 1px solid #e5e5ea;
			border-right: 1px solid #e5e5ea;
		}
		.grid-item:nth-child(even) {
			border-right: none;
		}
		.grid-item:nth-last-child(-n+2) {
			border-bottom: none;
		}
		.label {
			font-size: 12px;
			color: #8e8e93;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 5px;
		}
		.value {
			font-size: 15px;
			font-weight: 600;
		}
		.value-large {
			font-size: 24px;
			font-weight: 700;
			color: %s;
			padding: 20px;
			text-align: center;
		}
		.footer {
			margin-top: 50px;
			text-align: center;
			font-size: 12px;
			color: #aeaeb2;
		}
		.insights {
			padding: 20px;
			font-size: 14px;
			line-height: 1.6;
		}
	</style>
</head>
<body>
	<div class="report-container">
		<div class="header header-brand">
			<div class="brand-name">%s</div>
			<div class="report-title">Automated Valuation Report</div>
		</div>

		<div class="section">
			<div class="section-title">Valuation Summary</div>
			<div class="grid-2">
				<div class="grid-item">
					<div class="label">Property Type</div>
					<div class="value">%s</div>
				</div>
				<div class="grid-item">
					<div class="label">Date</div>
					<div class="value">%s</div>
				</div>
				<div class="grid-item">
					<div class="label">State</div>
					<div class="value">%s</div>
				</div>
				<div class="grid-item">
					<div class="label">Model Used</div>
					<div class="value">%s</div>
				</div>
			</div>
			<div class="value-large" style="border-top: 1px solid #e5e5ea; background-color: #fafafa;">
				Estimated Value: %s %s
			</div>
		</div>

		<div class="section">
			<div class="section-title">Property Details</div>
			<div class="grid-2">
				<div class="grid-item">
					<div class="label">Condition</div>
					<div class="value">%s</div>
				</div>
				<div class="grid-item">
					<div class="label">Land Area (Sqm)</div>
					<div class="value">%.2f</div>
				</div>
				<div class="grid-item">
					<div class="label">Building Area (Sqm)</div>
					<div class="value">%.2f</div>
				</div>
				<div class="grid-item">
					<div class="label">Premium Location</div>
					<div class="value">%v</div>
				</div>
			</div>
		</div>

		<div class="section">
			<div class="section-title">Analysis Insights</div>
			<div class="insights">
				<strong>Confidence Score: %d%%</strong><br><br>
				This valuation relies on current market data and the algorithmic engine. Factors such as exact geographic coordinates, hidden structural defects, and immediate macroeconomic shifts may cause variances in real-world sale prices.
			</div>
		</div>

		<div class="footer">
			Generated by %s System - Confidential
		</div>
	</div>
</body>
</html>`,
		googleFontUrl, fontFamily, contentMargin, letterheadCSS,
		brandColor, brandColor,
		brandName,
		model.Property.Type, dateStr, model.Property.State, strings.ToUpper(model.ModelType),
		currency, formatCommas(model.EstimatedValue),
		model.Property.Condition, model.Property.LandAreaSqm, model.Property.BuildingAreaSqm, model.Property.IsPremium,
		model.ConfidenceScore,
		brandName,
	)
}

func GenerateValuationPDF(model Models.ValuationModel, sub Models.Subscription) ([]byte, error) {
	htmlStr := generateHTML(model, sub)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprint(w, htmlStr)
	}))
	defer ts.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var pdfBuffer []byte
	err := chromedp.Run(ctx,
		chromedp.Navigate(ts.URL),
		chromedp.Sleep(2*time.Second),
		chromedp.ActionFunc(func(ctx context.Context) error {
			buf, _, err := page.PrintToPDF().
				WithPrintBackground(true).
				WithMarginTop(0.4).
				WithMarginBottom(0.4).
				WithMarginLeft(0.4).
				WithMarginRight(0.4).
				WithPaperWidth(8.27).
				WithPaperHeight(11.69).
				Do(ctx)
			if err != nil {
				return err
			}
			pdfBuffer = buf
			return nil
		}),
	)

	return pdfBuffer, err
}
