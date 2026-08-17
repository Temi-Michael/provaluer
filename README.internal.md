# ProValuer — Internal / Operations README

> **Private.** Do not publish. Deployment, ops, the market-data scraper, and known issues.
> For product overview and public setup, see [`README.md`](README.md).

---

## 1. Architecture at a glance

```
Browser ──▶ Next.js (3000) ──/api/* rewrite──▶ Go API (8080) ──▶ PostgreSQL
                                                      │
                                                      ├─ Colly scraper (daily 02:00)
                                                      └─ Cron goroutines (rent reminders, monthly usage reset)
```

- The Go process runs **its own in-process schedulers** (goroutines in `Controllers/CronController.go`) — there is no external cron/queue. If the process restarts, the next run is recomputed on boot.
- GORM `AutoMigrate` runs on every boot (`Config/Database.go`) and is safe/idempotent. It also seeds `StateRate` and `MaterialCostConfig` defaults via `FirstOrCreate`.

---

## 2. Secrets & config (real values live in `backend/.env`, git-ignored)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Prod: managed Postgres DSN with `sslmode=require`. Falls back to `host=localhost user=postgres password=postgres dbname=provaluer` if unset — **never rely on this in prod.** |
| `JWT_SECRET` | Hard startup gate — `main.go` calls `log.Fatal` if empty. Rotating it invalidates all active user sessions. |
| `AES_SECRET_KEY` | Encrypts stored user API keys (`Helpers/AES.go`). Key is padded/truncated to 32 bytes. **Rotating it makes previously-encrypted values undecryptable** — plan a re-encryption migration before rotating. |
| `SMTP_MOCK` | Truthy → emails are logged, not sent. Keep on in staging. |
| `SMTP_*` | Report + rent-reminder delivery. |

Generate:
```bash
openssl rand -base64 32   # JWT_SECRET
openssl rand -hex 16      # AES_SECRET_KEY
```

Admin accounts are **not** created by signup. Seed manually (Argon2-hashed, role `SuperAdmin`):
```bash
go run scripts/seed_admin.go --email admin@provaluer.com --password '<strong>' --name 'Admin'
```
Note: `scripts/` is git-ignored, so it ships only in the working tree / server checkout, not via a clean clone of the repo history.

---

## 3. The market-data scraper

**Source:** NigeriaPropertyCentre.com (server-rendered HTML, no JS needed — Colly raw GET works).
**Code:** `src/Services/scraper.go`, status tracking in `scraper_status.go`, consumed by `valuation_engine.go`.

**How it runs**
- Daily at **02:00** local time (`StartCronJobs` goroutine).
- Manual trigger (admin session required): `POST /api/cron/trigger-scraper`.
- Live progress: `GET /api/cron/scraper-status`.
- Iterates 10 states × 2 feeds (`for-sale`, `to-let`), max 15 pages/feed, 1.5s ± 0.5s delay, parallelism 1. UA: `ProvaluerSurveyBot/1.0`.
- UPSERTs on `source_id` (`NPC-<numericID>`), updating price/beds/baths/area/premium/scraped_at.

**Selectors (verified against live HTML 2026-08-13):**
| Field | Selector |
|---|---|
| Card | `article.group` (~21/page) |
| Price | `span[class*='tabular-nums']` → `₦…` |
| Title | `h3` |
| Location | `span.truncate` → `"Area, State"` |
| Detail link / ID | `a[class*='absolute'][class*='inset-0']`, ID via regex `/(\d{5,})-` |
| Pagination | `a[href*='?page=']` |

All for-sale selectors and parsing (price/location/beds/source-ID) confirmed working.

### ⚠️ KNOWN BUG — `to-let` feed is broken

NPC changed its rental URL scheme. The scraper builds `https://www.nigeriapropertycentre.com/to-let/<state>`, which now **301-redirects to the all-Nigeria listing** (`Flats, Houses & Land in Nigeria (156,315 available)`), *ignoring the state filter*. Consequences:

- All 10 `to-let` feeds scrape the **same** generic all-Nigeria page → rental data is duplicated and not state-specific.
- Listings get mis-tagged by the `state.CanonName` fallback whenever a listing's own text lacks a state.
- Income/rental valuation quality is degraded.

**The correct path is now `for-rent/<state>`** (verified: `for-rent/lagos` → `Flats & Houses for Rent in Lagos (35,071 available)`).

**Fix** (in `src/Services/scraper.go`):
1. In `RunPropertyScraper` / `scrapeStateStatus`, change the feed slug from `"to-let"` to `"for-rent"`.
2. Update the rental-status detection in `parseListingCard` — it currently keys off `strings.Contains(status, "let")`, which won't match `for-rent`. Match `"rent"` (already handled) but drop reliance on `"let"`.
3. Re-verify pagination on `for-rent` pages (same `?page=N` scheme observed).

For-sale scraping needs no change.

---

## 4. Other background jobs (`CronController.go`)

| Job | Schedule | Notes |
|---|---|---|
| `CheckUpcomingRent` | daily 00:00 | Emails tenants with a lease due in exactly 7 days. **Currently sends a mock report email** (`SendReportEmail`, no dedicated reminder template) — flagged tech debt. |
| `ResetMonthlyUsage` | 1st of month 00:00 | Resets `models_used_this_month` to 0 for all subscriptions. |
| Scraper | daily 02:00 | See above. |

---

## 5. Deployment — Neon + Render + Vercel

Deploy in this order: **database → backend → frontend → back-fill backend CORS**.
The two apps reference each other's URLs, so the backend must exist before Vercel
can proxy to it, and the frontend URL must exist before CORS can allow it.

### 5.1 Database — Neon
1. Create a Neon project (pick the region nearest your users).
2. Copy the **pooled** connection string and append TLS:
   `postgresql://USER:PASS@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require`
3. Nothing else to run — GORM `AutoMigrate` creates every table and seeds
   `StateRate` / `MaterialCostConfig` on first backend boot.

### 5.2 Backend — Render (Web Service)
Root directory `backend`, Go runtime.

| Setting | Value |
|---|---|
| Build command | `go build -o provaluer-api` |
| Start command | `./provaluer-api` |
| Health check path | `/api/health` |

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon pooled DSN with `sslmode=require` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `AES_SECRET_KEY` | `openssl rand -hex 16` |
| `ALLOWED_ORIGINS` | Vercel URL — set after step 5.3 |
| `GO_VERSION` | `1.26.2` (must match `go.mod`) |
| `TZ` | `Africa/Lagos` — cron uses local time |
| `SMTP_MOCK` | `true` until real SMTP is wired |

Render injects `PORT` automatically; `main.go` already honours it.

⚠️ **Render's free tier sleeps after ~15 min idle.** The scraper and rent
reminders are in-process goroutines (§4) and will not fire on a sleeping
instance. Either run a paid instance, or keep the free tier and drive the
scraper externally with a Render Cron Job hitting
`POST /api/cron/trigger-scraper` with an admin bearer token.

Seed the first admin from Render's **Shell** tab (see §2) — `scripts/` is
tracked in git specifically so it is available there.

### 5.3 Frontend — Vercel
Root directory `frontend`. Next.js is auto-detected.

| Key | Value |
|---|---|
| `BACKEND_URL` | `https://<your-service>.onrender.com` |

`next.config.ts` reads `BACKEND_URL` and rewrites `/api/*` to it. The rewrite
destination is baked in at build time, so **redeploy after changing it**.

### 5.4 Close the loop
Set `ALLOWED_ORIGINS` on Render to the Vercel production URL (comma-separated
for multiple, e.g. preview domains + custom domain), then redeploy the backend.
Missing this makes every browser API call fail CORS.

### Pre-launch checklist
- [ ] `JWT_SECRET` + `AES_SECRET_KEY` set to strong, backed-up values
- [ ] `DATABASE_URL` → Neon pooled DSN with `sslmode=require`
- [ ] `ALLOWED_ORIGINS` (Render) → Vercel origin, backend redeployed
- [ ] `BACKEND_URL` (Vercel) → Render origin, frontend redeployed
- [ ] `GO_VERSION` matches `go.mod` (1.26.2)
- [ ] `TZ` set for cron correctness
- [ ] Admin account seeded via Render Shell
- [ ] Scraper reachable — run once and confirm rows land in `scraped_properties`
- [ ] Paid instance **or** external cron for the scraper (free tier sleeps)
- [ ] Tier-limit back-fill applied to existing rows (§7)
- [ ] `SMTP_MOCK` off + real SMTP creds (or intentionally left mocked)

## 7. Post-deploy data back-fill

`gorm:"default:5"` only applies to newly created columns, so rows written under
the old limits keep their old values:

```sql
UPDATE subscriptions SET monthly_limit = 5   WHERE plan_tier = 'Free';
UPDATE subscriptions SET monthly_limit = 50  WHERE plan_tier = 'Professional';
UPDATE subscriptions SET monthly_limit = 150 WHERE plan_tier = 'Enterprise';
```

Listings scraped before the `for-rent` fix (§3) are mislabelled; clear them and
re-run the scraper:

```sql
TRUNCATE TABLE scraped_properties RESTART IDENTITY;
```

---

## 6. Gotchas

- **`scripts/` is git-ignored** — admin seeding & DB query helpers won't appear in a fresh clone from history. Keep them in the deploy artifact.
- **`provaluer.db` / `*.db`** are git-ignored SQLite leftovers; the live app is Postgres via GORM.
- **AutoMigrate never drops columns** — destructive schema changes need a manual migration.
- **AES key rotation is destructive** to already-encrypted data (§2).
- Rate limiting is per-IP in-memory (`Middleware/RateLimitMiddleware.go`) — resets on restart and isn't shared across instances; use a shared limiter if you scale horizontally.
