# Pulse — Monitoring Pipeline for Multi-Agent SaaS Platforms

**Pulse** is a lightweight, zero-downtime operations monitoring pipeline deployable on **Vercel** with **Vercel Postgres (Neon)**. It continuously monitors LLM credit burn, database health, and API uptime for multi-agent SaaS platforms, paging the team on Slack when anomalous degradation or downtime occurs.

---

## 🌟 Key Features

1. **LLM Spend & Credit Burn Monitor (`lib/monitors/llmCredits.ts`)**:
   - Tracks Month-To-Date (MTD) spend across OpenAI, Anthropic, and Google Gemini against a monthly budget limit.
   - Calculates real-time hourly burn rates ($/hr) and triggers `degraded` at 80% or `critical` at 95% budget consumption.
2. **Database Health Probe (`lib/monitors/dbHealth.ts`)**:
   - Measures round-trip SQL query latency (`SELECT 1`) plus write/read updates against a dedicated `health_probe` table.
   - Triggers `degraded` (>300ms) or `critical` (>1000ms / unreachable).
3. **API Availability & Error Rate Watch (`lib/monitors/apiWatch.ts`)**:
   - Pings configured HTTP services with timeout guards (5000ms default) and tracks rolling failure rates.
4. **Slack Alert Engine & AI Diagnosis (`lib/alertEngine.ts`)**:
   - Formats Slack Block Kit messages with severity indicators (`🔴 CRITICAL`, `⚠️ DEGRADED`, `✅ RECOVERED`).
   - Enforces a configurable cooldown period (`ALERT_COOLDOWN_MINUTES=15`) to prevent alert fatigue.
   - Automatically generates AI Root-Cause Incident Analysis when `GEMINI_API_KEY` is set.
5. **Idempotent Concurrency Guard (`app/api/cron/route.ts`)**:
   - Guards cron ticks with PostgreSQL advisory locks (`pg_try_advisory_lock(727272)`).
6. **Real-time Premium Dashboard (`app/page.tsx`)**:
   - Features SVG Sparkline Heartbeat timeline (60 ticks), LLM spend panel with task log modal, service status cards with status filters, and persistent Slack alert feed.

---

## 📁 Repository Structure

```
.
├── app/
│   ├── layout.tsx                 # Root layout with IBM Plex fonts & dark theme
│   ├── page.tsx                   # Main Pulse dashboard (interactive polling)
│   ├── globals.css                # Section 6 design tokens & pulse glow styles
│   └── api/
│       ├── cron/route.ts          # Vercel Cron trigger & orchestrator endpoint
│       ├── status/route.ts        # Dashboard payload endpoint
│       ├── events/llm/route.ts    # Agent LLM token/cost event logging endpoint
│       └── test-alert/route.ts    # Test alert & failure simulation endpoint
├── lib/
│   ├── types.ts                   # Domain types, CheckResult, StatusPayload
│   ├── db.ts                      # Postgres pool, schema migrations & fallback store
│   ├── alertEngine.ts             # Cooldown, Slack webhooks & Gemini AI diagnosis
│   └── monitors/
│       ├── dbHealth.ts            # DB connection & write/read probe monitor
│       ├── apiWatch.ts            # External/internal API availability monitor
│       └── llmCredits.ts          # Spend tracking & burn rate calculation
├── components/
│   ├── Heartbeat.tsx              # SVG sparkline visual timeline
│   ├── SpendPanel.tsx             # LLM monthly budget & provider breakdown
│   ├── ServiceTable.tsx           # Monitored infrastructure table with status filters
│   └── AlertFeed.tsx              # Persistent incident & recovery feed
├── tests/                         # Isolated unit test suite
│   ├── types.test.ts
│   ├── monitors.test.ts
│   ├── alertEngine.test.ts
│   └── db.test.ts
├── scripts/
│   └── migrate.ts                 # CLI database schema migration script
├── vercel.json                    # 5-minute Vercel Cron schedule config
├── .env.example                   # Environment variable template
├── .env                           # Local environment variables
├── package.json
└── README.md
```

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env` and fill in sensitive variables:

```env
# Database connection URL (Vercel Postgres, Neon, or local PostgreSQL)
POSTGRES_URL=postgres://pulse_user:pulse_password@localhost:5432/pulse_db

# Slack Incoming Webhook URL for paging alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Secret token to authorize GET /api/cron calls
CRON_SECRET=pulse_cron_secret_key_change_in_production

# Optional Gemini API Key for AI Incident Analysis in Slack alerts
GEMINI_API_KEY=your_gemini_api_key

# Monthly LLM budget in USD
LLM_MONTHLY_BUDGET_USD=600

# JSON array of monitored HTTP endpoints
MONITORED_SERVICES=[{"name":"orders-api","url":"https://httpbin.org/status/200","expectedStatus":200,"timeoutMs":5000},{"name":"agent-dispatch-service","url":"https://httpbin.org/status/200","expectedStatus":200,"timeoutMs":5000}]

# Cooldown period in minutes before re-alerting on the same service
ALERT_COOLDOWN_MINUTES=15

# Public Dashboard base URL
DASHBOARD_URL=http://localhost:3000
```

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migration
```bash
npm run migrate
```
*(Note: If `POSTGRES_URL` is omitted in local dev, Pulse automatically uses an in-memory fallback ledger store).*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Pulse includes a dedicated test suite under `tests/` using **Vitest**:

```bash
npm test
```

All 4 test files run isolated unit tests verifying:
- Domain interfaces & type definitions (`tests/types.test.ts`)
- Monitor return structures & metric values (`tests/monitors.test.ts`)
- Slack Block Kit formatting & cooldown logic (`tests/alertEngine.test.ts`)
- In-memory store fallback, advisory locks & ledger queries (`tests/db.test.ts`)

---

## 🛠️ Production Build

Validate TypeScript compilation & Next.js production bundler:

```bash
npm run build
```

---

