@AGENTS.md
# ProValuer

## Overview
Property valuation SaaS. Users submit property details to get AI-powered valuations, manage a portfolio, track rent/leases, browse a marketplace, and export PDF reports. Subscription tiers gate features. Separate admin panel for managing users and overriding subscriptions.

## Stack
- **Frontend**: Next.js 16.2.9 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react, chart.js, next-themes
- **Backend**: Go 1.26, net/http, GORM + PostgreSQL, JWT auth, chromedp (scraping), fpdf (PDF export)
- **API proxy**: `/api/*` → `http://localhost:8080` via `next.config.ts` rewrites

## Commands

### Frontend (`/frontend`)
- **Dev**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **No test runner configured**

### Backend (`/backend`)
- **Run**: `go run main.go`
- **Build**: `go build -o provaluer-api`
- **DB seed**: `go run scripts/seed_admin.go`

## Frontend Route Structure
```
src/app/
├── page.tsx                        # Landing / home
├── layout.tsx                      # Root layout
├── not-found.tsx
├── globals.css
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx                  # Sidebar + Topbar shell
│   ├── dashboard/page.tsx          # Main overview
│   ├── create/page.tsx             # Create valuation
│   ├── models/
│   │   ├── page.tsx                # List valuations
│   │   └── [id]/page.tsx           # Single valuation detail + PDF export
│   ├── portfolio/
│   │   ├── page.tsx                # Portfolio overview
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── transactions/page.tsx
│   ├── marketplace/page.tsx
│   ├── intelligence/page.tsx       # Market intelligence
│   ├── measure/page.tsx
│   ├── subscription/
│   │   ├── page.tsx                # Plans
│   │   └── mine/page.tsx           # Current plan
│   └── profile/page.tsx
├── admin-login/page.tsx
└── admin/
    ├── layout.tsx
    ├── dashboard/page.tsx
    └── settings/page.tsx
```

## Component Structure
```
src/components/
├── ThemeProvider.tsx
├── ui/
│   ├── ConfirmModal.tsx
│   ├── Tooltip.tsx
│   └── UpgradeModal.tsx
├── dashboard/
│   ├── Sidebar.tsx
│   └── Topbar.tsx
├── admin/
│   ├── AdminSidebar.tsx
│   └── AdminTopbar.tsx
└── home/
    ├── NavbarAuth.tsx
    └── MarketplacePreview.tsx
```

## Backend API Summary
All routes under `/api/`. Auth endpoints are public; others require JWT (`Authorization: Bearer <token>`) or admin session cookie.

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/verify` |
| Profile | `POST /api/profile/api-key`, `PUT /api/profile/preferences`, `DELETE /api/profile/account` |
| Subscription | `GET /api/subscription/mine`, `POST /api/subscription/upgrade`, `PUT /api/subscription/enterprise-settings` |
| Marketplace | `GET /api/marketplace` (public) |
| Models | `GET /api/models`, `GET /api/models/:id`, `GET /api/models/:id/export/pdf`, `POST /api/models/:id/export/email` |
| Valuation | `POST /api/valuation/create` |
| Portfolio | `GET/POST /api/portfolio/properties`, `GET /api/portfolio/:id`, `POST /api/portfolio/tenants`, `POST /api/portfolio/leases`, `GET/POST /api/portfolio/transactions` |
| Intelligence | `GET /api/intelligence` |
| Admin | `POST /api/admin/auth/login`, `GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/users/subscription`, `POST /api/admin/auth/logout` |

## Backend Source Layout (`/backend/src`)
- `Config/Database.go` — DB connection (GORM + PostgreSQL)
- `Models/Models.go`, `Portfolio.go`, `ScrapedProperty.go` — GORM model definitions
- `Controllers/` — one file per domain (Auth, Valuation, Portfolio, Subscription, etc.)
- `Helpers/` — JWT, AES, PDF generation, Mailer, SubscriptionHelper
- `Middleware/` — `RequireAuth` (JWT), `RequireAdmin` (session), `RateLimitMiddleware`
- `Routes/Routes.go` — all route registration

## Key Conventions
- Tailwind v4 utility classes (no `tailwind.config.js`; configured via PostCSS)
- `next-themes` for dark/light mode; wrap with `ThemeProvider`
- `lucide-react` for icons
- Backend uses `GORM` AutoMigrate; schema lives in `Models/`
- PDF reports generated server-side with `fpdf`; font files in `backend/fonts/`
- Backend `.env` holds DB credentials, JWT secret, SMTP config

## Token Efficiency & Behavior Rules
- **No Yapping**: Zero pleasantries, apologies, or filler ("Great question!", "Sure!", "Let me know if you need anything else"). Start with the answer or the change.
- **Targeted Edits Only**: Use the Edit tool with surgical precision. Never output or rewrite an entire file when one function changed. If a file is >100 lines, show only the changed block.
- **No Unsolicited Explanation**: Don't narrate what you're about to do or summarize what you did. No "Here's the updated component:" before a code block.
- **Don't Repeat the Prompt**: Never restate or paraphrase the user's request. Execute it.
- **Ask Before Speculating**: If the task requires knowing the API shape, a model field, a component prop, or a business rule — ask for that one thing. Don't guess and write 200 lines that may be wrong.
- **No Boilerplate Comments**: Don't add `// TODO`, `// handle error`, `// update as needed`, or any comment that states the obvious. Comments only for non-obvious invariants or workarounds.
- **No Unsolicited Refactors**: Fix what was asked. Don't rename variables, restructure files, or clean up surrounding code unless asked.
- **Fullstack Awareness**: Changes to backend models or routes almost always require frontend changes too (and vice versa). Flag the pairing — don't silently do only half.
- **Prompt for `/compact`**: When conversation history is getting long, say: "Context is getting large, please run `/compact`".
