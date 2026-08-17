# ProValuer

Data-driven **property valuation SaaS** for the Nigerian real estate market. Users submit property details and receive an instant valuation backed by live market data, manage a property portfolio (tenants, leases, rent tracking), browse a marketplace, view market intelligence, and export professional PDF reports. Subscription tiers gate features, and a separate admin panel manages users, pricing config, and the market-data scraper.

---

## Features

- **Valuation engine** — four model types (Comparable / Cost / Income / Automated) computed from real scraped listings with IQR outlier filtering and a dynamic confidence score, falling back to per-state base rates when live data is thin.
- **Portfolio CRM** — properties, tenants, leases, transactions, maintenance logs, and automated rent reminders.
- **Market intelligence** — aggregates over real market data by state and property type.
- **Marketplace** — public browsable listings.
- **PDF export** — server-rendered valuation reports with embedded fonts; optional email delivery.
- **Subscriptions** — tiered plans with monthly usage limits.
- **Admin panel** — user management, subscription overrides, editable state rates & material-cost config, and scraper monitoring.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, chart.js, next-themes, lucide-react |
| Backend | Go 1.26, `net/http`, GORM, JWT auth, Argon2 password hashing |
| Database | PostgreSQL |
| Scraper | [Colly](https://github.com/gocolly/colly) — daily background job over public listing data |
| PDF | `fpdf` (server-side) |

The frontend proxies `/api/*` to the backend (`http://localhost:8080` in development) via `next.config.ts` rewrites.

---

## Repository Layout

```
provaluer/
├── backend/            # Go API
│   ├── main.go
│   ├── src/
│   │   ├── Config/         # DB connection + AutoMigrate + seed data
│   │   ├── Controllers/    # one file per domain
│   │   ├── Services/       # scraper + valuation engine
│   │   ├── Models/         # GORM models
│   │   ├── Helpers/        # JWT, AES, PDF, Mailer, Argon2
│   │   ├── Middleware/     # auth, admin session, rate limiting
│   │   └── Routes/         # route registration
│   └── fonts/          # PDF report fonts
└── frontend/           # Next.js app
    └── src/app/        # App Router routes (auth, dashboard, admin)
```

---

## Prerequisites

- **Go** 1.26+
- **Node.js** 20+ and npm
- **PostgreSQL** 14+ running locally (or a hosted instance)

---

## Local Development

### 1. Database

Create a Postgres database:

```bash
createdb provaluer
```

Tables are created automatically on first backend start via GORM `AutoMigrate` — no manual migration step. Default state rates and material-cost config are also seeded automatically.

### 2. Backend

```bash
cd backend
cp .env.example .env      # then fill in the values (see Configuration below)
go mod download
go run main.go
```

The API starts on **http://localhost:8080**. Health check: `GET /api/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app starts on **http://localhost:3000** and proxies API calls to the backend.

### 4. Create an admin account

The admin panel uses a separate account table. Seed one:

```bash
cd backend
go run scripts/seed_admin.go --email you@example.com --password 'a-strong-password' --name 'Your Name'
```

Then sign in at **http://localhost:3000/admin-login**.

---

## Configuration

The backend reads configuration from `backend/.env` (never commit this file — it is git-ignored).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | recommended | Postgres DSN, e.g. `host=localhost user=postgres password=postgres dbname=provaluer port=5432 sslmode=disable`. Falls back to a localhost default if unset. |
| `JWT_SECRET` | **yes** | Secret for signing user JWTs. The server refuses to start without it. |
| `AES_SECRET_KEY` | **yes** | Key for encrypting stored secrets (e.g. API keys). Use a 32-byte value. The server refuses to start without it. |
| `PORT` | no | API port (default `8080`). |
| `SMTP_MOCK` | no | Set truthy to log emails instead of sending (useful in dev). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | for email | SMTP credentials for report/reminder emails. |

Generate strong secrets:

```bash
openssl rand -base64 32   # JWT_SECRET
openssl rand -hex 16      # AES_SECRET_KEY (32 hex chars = 32 bytes)
```

---

## Production Build

**Backend:**
```bash
cd backend
go build -o provaluer-api
./provaluer-api
```

**Frontend:**
```bash
cd frontend
npm run build
npm run start        # serves on port 3000
```

For production, point the frontend's `/api/*` rewrite at your deployed backend URL (see the deployment guide) and serve both behind HTTPS.

---

## API Overview

All routes are under `/api/`. Auth and marketplace endpoints are public; everything else requires a JWT (`Authorization: Bearer <token>`) or an admin session cookie.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/verify` |
| Profile | `POST /profile/api-key`, `PUT /profile/preferences`, `DELETE /profile/account` |
| Subscription | `GET /subscription/mine`, `POST /subscription/upgrade`, `PUT /subscription/enterprise-settings` |
| Marketplace | `GET /marketplace` *(public)* |
| Models | `GET /models`, `GET /models/:id`, `GET /models/:id/export/pdf`, `POST /models/:id/export/email` |
| Valuation | `POST /valuation/create` |
| Portfolio | `GET/POST /portfolio/properties`, `GET /portfolio/:id`, `POST /portfolio/tenants`, `POST /portfolio/leases`, `GET/POST /portfolio/transactions`, `POST /portfolio/valuate` |
| Intelligence | `GET /intelligence` |
| Admin | `POST /admin/auth/login`, `GET /admin/stats`, `GET /admin/users`, `POST /admin/users/subscription`, `GET/PUT /admin/state-rates`, `GET/PUT /admin/material-costs`, `GET /admin/market-data` |

---

## License

Proprietary — all rights reserved.
