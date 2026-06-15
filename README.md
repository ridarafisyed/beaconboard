# Beaconboard

A real-time HTTP monitoring dashboard. It pings an endpoint every five minutes, records how fast it responded and whether it succeeded, and shows everything on a live dashboard — with charts, incident tracking, and AI-generated health summaries.

---

## Table of contents

- [What it does](#what-it-does)
- [Live demo](#live-demo)
- [Getting started locally](#getting-started-locally)
- [Environment variables](#environment-variables)
- [Architecture overview](#architecture-overview)
- [Technology choices and reasoning](#technology-choices-and-reasoning)
- [Database schema](#database-schema)
- [Testing strategy](#testing-strategy)
- [Assumptions made](#assumptions-made)
- [Future improvements](#future-improvements)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Deployment](#deployment)

---

## What it does

Every five minutes Beaconboard fires a POST request to [httpbin.org](https://httpbin.org) (a harmless public echo API), measures the response time and HTTP status code, saves the result to a database, and instantly pushes it to anyone watching the dashboard over a live connection. You can also trigger a manual ping any time from the UI or via the API.

On the dashboard you get:

- **Live indicator** — shows whether the SSE connection is open, and counts down to the next reconnect attempt if it drops
- **Stat cards** — total pings, average response time, and success rate at a glance
- **Response time chart** — a line chart of recent pings, green dot for success, red for failure
- **Incidents** — failures grouped by error code so you can see patterns quickly
- **AI Insights** — powered by Google Gemini; analyses the last 50 pings and returns a headline, specific observations, and a recommendation, visualised with a success-rate ring, a response-time bar chart, and a trend comparison
- **History table** — every ping on record, filterable by status, event type, and date range, with pagination

---

## Live demo

| Service | URL |
|---|---|
| Frontend | https://beaconboard-six.vercel.app/ |
| Backend API docs | *https://beaconboard.onrender.com/api-docs* |

---

## Getting started locally

You need Node.js 24 and a PostgreSQL database. [Neon](https://neon.tech) has a generous free tier that works out of the box.

### 1. Clone the repo

```bash
git clone https://github.com/ridarafisyed/beaconboard.git
cd beaconboard
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in at least `DATABASE_URL`. Everything else has a default.

```bash
npm install
npm run db:migrate init   # creates the PingResult table in your database
npm run dev               # starts on http://localhost:5000
```

API docs (Swagger UI): `http://localhost:5000/api-docs`

### 3. Set up the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:3000
```

Open `http://localhost:3000`. The monitoring job fires automatically every five minutes, or hit **Trigger Ping** to run one immediately.

---

## Environment variables

Copy `backend/.env.example` to `backend/.env` to get started.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `PORT` | no | `5000` | Port the backend listens on |
| `NODE_ENV` | no | `development` | `development` or `production` |
| `HTTPBIN_BASE_URL` | no | `https://httpbin.org` | The endpoint to monitor |
| `CORS_ORIGIN` | no | `*` | Allowed CORS origins |
| `GEMINI_API_KEY` | no | — | Enables AI Insights. Free key at [aistudio.google.com](https://aistudio.google.com) |
| `GEMINI_MODEL` | no | `gemini-2.0-flash-lite` | Which Gemini model to use |
| `GEMINI_BASE_URL` | no | Google's default | Custom Gemini endpoint if needed |
| `RENDER_EXTERNAL_URL` | no | — | Set automatically by Render. Used to point Swagger at the right host |

---

## Architecture overview

Beaconboard is split into two independent apps that talk through a REST API and an SSE stream.

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js · Vercel)                                │
│                                                             │
│  Dashboard page                                             │
│    ├── TanStack Query  ──── GET /monitoring/history ──────► │
│    ├── useLiveUpdates  ──── GET /monitoring/events (SSE) ─► │
│    └── AIInsightsCard  ──── GET /ai/insights ─────────────► │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP / SSE
┌─────────────────────────────▼───────────────────────────────┐
│  Backend (Express · Render)                                 │
│                                                             │
│  Cron job (every 5 min)                                     │
│    └── MonitoringService                                    │
│          ├── generateMonitoringPayload()  (random event)    │
│          ├── HttpBinClient.ping()         (POST to httpbin) │
│          ├── MonitoringRepository.save()  (write to DB)     │
│          └── MonitoringEvents.emit()      (push via SSE)    │
│                                                             │
│  AiService                                                  │
│    └── reads last 50 records → computes stats               │
│          └── sends prompt to Gemini → returns insights      │
│                                                             │
│  PostgreSQL (Neon)                                          │
└─────────────────────────────────────────────────────────────┘
```

**How live updates work:** The backend holds open an SSE connection for each connected browser tab. When a ping completes, it emits an in-process event via Node's `EventEmitter`. The SSE handler picks that up and writes it to the response stream. The frontend reconnects automatically with exponential backoff if the connection drops.

**How AI insights work:** The AI service reads the last 50 ping records directly from the database, computes a set of statistics (success rate, avg/min/max response time, trend direction, failure codes), builds a structured prompt, and sends it to Gemini. The model returns a JSON object with a headline, observations, and a recommendation. The computed stats are also returned alongside the AI text so the frontend can render charts without a second request.

---

## Technology choices and reasoning

### Backend — Node.js + Express 5

Express is the most battle-tested HTTP framework in the Node ecosystem. It is intentionally minimal, which keeps the project structure transparent and easy to reason about. Express 5 (now stable) ships with native async error handling so there is no need for `try/catch` wrappers on every route handler.

**Why not NestJS?** NestJS would be a reasonable choice for a large team or a very complex API. For a project of this scope it adds significant boilerplate and cognitive overhead without meaningful benefit.

### Database — PostgreSQL (Neon)

Monitoring data is inherently relational: every record has a fixed schema, queries are almost always filtered and sorted by timestamp, and aggregate stats (averages, counts) map naturally to SQL. A document database like MongoDB would work but gives up first-class SQL aggregation for no gain here.

Neon was chosen as the host because it provides a fully managed, serverless Postgres instance on a free tier with no cold-start penalty for regular query traffic.

### ORM — Prisma

Prisma generates a fully typed query client from the schema, which means TypeScript catches schema/query mismatches at compile time rather than runtime. The migration workflow (`prisma migrate`) keeps the database schema versioned alongside the code.

### Frontend — Next.js 16 + React 19

Next.js with the App Router is the natural home for a React project that needs server-side capabilities. Even though this dashboard is largely client-side, Next.js gives us TypeScript, fast refresh, and Vercel deployment with zero configuration.

### State management — TanStack Query + Zustand

These two libraries handle different kinds of state cleanly. TanStack Query manages server state (fetching history, caching, background refetching). Zustand manages client state (live ping results pushed via SSE, connection status). Keeping them separate means neither has to do things it is not designed for.

### Charts — Recharts

Recharts is built on top of D3 and React, composes well with JSX, and has good TypeScript types. It is already widely used in the ecosystem, which makes it easy to find examples and debug issues.

### AI — Google Gemini

The free tier of the Gemini API is generous enough to support on-demand insight generation without a credit card. The `@google/generative-ai` SDK is straightforward and well-typed. The model and base URL are both configurable via environment variables, so switching providers later is a one-line change.

---

## Database schema

There is a single table, `PingResult`, which stores the outcome of every monitoring ping.

```sql
CREATE TABLE "PingResult" (
  "id"             TEXT PRIMARY KEY,          -- cuid generated by the app
  "requestId"      TEXT UNIQUE NOT NULL,      -- UUID per ping for deduplication
  "timestamp"      TIMESTAMP NOT NULL,        -- when the ping was initiated
  "statusCode"     INTEGER NOT NULL,          -- HTTP status returned by httpbin
  "responseTimeMs" INTEGER NOT NULL,          -- round-trip time in milliseconds
  "eventType"      TEXT NOT NULL,             -- health_check | status_probe | latency_test
  "environment"    TEXT NOT NULL,             -- NODE_ENV at time of ping
  "retry"          BOOLEAN NOT NULL DEFAULT false,
  "responseBody"   JSONB NOT NULL,            -- full response from httpbin
  "createdAt"      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX ON "PingResult" ("createdAt");
CREATE INDEX ON "PingResult" ("statusCode");
```

**Why a single table?** The monitoring use case is append-only. Every ping is independent, there are no foreign keys, and there is no normalisation to do. A single table with two covering indexes (timestamp for ordered history, status code for filtering failures) handles all the query patterns efficiently.

---

## Testing strategy

Tests live in `backend/src/__tests__/` and `frontend/src/__tests__/`. Run them with `npm test` in either directory.

### Core components identified for testing

These are the components where a bug would cause silent data loss or wrong results — they get the most coverage:

**`monitoring.service.ts`** — the heart of the app. Tests verify that a full monitoring cycle (payload generation → ping → save → SSE emit) runs correctly, and that errors from the HTTP client are propagated rather than swallowed.

**`ai.service.ts`** — tests verify the statistics computed from raw records (success rate, trend direction, avg/min/max) before they are sent to Gemini, since bad inputs produce meaningless AI output.

**`payload-generator.ts`** — small but important. Verifies that every generated payload has a unique `requestId`, a valid ISO timestamp, and one of the three allowed event types.

**Frontend `AIInsightsCard`** — the most complex UI component. Tests verify that the empty state, loading state, error state, and populated state all render correctly, and that clicking Regenerate calls the API again.

### What is not tested (and why)

The Prisma repository layer is not unit tested — it would require either a real database or a mock that is more complex than the code it tests. Integration tests against a real Neon branch would be the right approach here (see Future improvements).

### Running tests with coverage

```bash
# Backend
cd backend && npm run test:coverage

# Frontend
cd frontend && npm run test:coverage
```

Coverage reports are uploaded as artifacts on every CI run.

---

## Assumptions made

- **httpbin.org is the target.** The spec says "monitor an HTTP endpoint" without specifying which one. httpbin is ideal because it always responds with structured data, handles any HTTP method, and is publicly accessible without authentication. The base URL is configurable via `HTTPBIN_BASE_URL` if you want to point it at something else.

- **A five-minute polling interval is appropriate.** This matches what most uptime monitors use and keeps free-tier API costs low. It is configurable in code but not currently exposed as an environment variable.

- **One monitored endpoint is enough for now.** The spec does not mention monitoring multiple URLs, so the schema and UI assume a single target. Adding multi-target support would be a database schema change (add a `target` foreign key to `PingResult`) and some UI work.

- **AI insights are on-demand, not automatic.** Running Gemini on every ping would burn through free-tier quota quickly. Instead, the user clicks a button when they want a summary. The last 50 pings are analysed, which is enough to identify trends without hitting token limits.

- **No authentication.** The dashboard is read-only for anyone with the URL, and the trigger endpoint is not rate-limited. For a production deployment you would want at least an API key on write endpoints.

---

## Future improvements

These are things that were consciously left out due to time constraints, not overlooked:

- **Multi-target monitoring.** Let users add their own URLs to monitor, with separate history and stats per target.
- **Alerting.** Send an email or Slack message when the success rate drops below a threshold.
- **Integration tests.** Run tests against a real Neon branch (Neon supports database branching, which is perfect for this) so the repository layer is covered without mocks.
- **Rate limiting.** Add a simple rate limiter on the trigger and AI endpoints to prevent abuse.
- **Authentication.** Even a simple API key check on write endpoints would make it safe to expose publicly.
- **Configurable polling interval.** Expose the cron schedule as an environment variable.
- **Historical trend view.** Charts that span days or weeks, not just the most recent page of results.
- **Retry logic on AI calls.** The Gemini API occasionally returns 503 under load. A simple exponential-backoff retry (max 2 attempts) would make the feature more reliable without much code.

---

## API reference

Full interactive docs are at `/api-docs` on the running backend. Quick reference:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/monitoring/jobs/ping` | Trigger a manual ping |
| `GET` | `/api/v1/monitoring/history?page=1&limit=20` | Paginated ping history |
| `GET` | `/api/v1/monitoring/events` | SSE stream of live results |
| `GET` | `/api/v1/ai/insights` | Generate AI health summary |

---

## Project structure

```
beaconboard/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # type-check + test on every push
│       └── monitoring-cron.yml     # hits the ping endpoint every 5 min
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # database schema
│   │   └── migrations/             # versioned SQL migrations
│   ├── src/
│   │   ├── config/                 # env, database client, swagger
│   │   ├── jobs/                   # cron job that drives monitoring
│   │   ├── modules/
│   │   │   ├── ai/                 # Gemini integration
│   │   │   ├── health/             # health check endpoint
│   │   │   └── monitoring/         # ping logic, SSE, history
│   │   └── shared/                 # errors, middleware, utilities
│   ├── .env.example
│   └── Dockerfile
└── frontend/
    └── src/
        ├── app/                    # Next.js App Router (single page)
        ├── components/             # all UI components
        ├── hooks/                  # data fetching and SSE hooks
        ├── lib/                    # API client, types, filters
        └── store/                  # Zustand store for live results
```

---

## Deployment

### Backend → Render

1. Create a **Web Service** on [render.com](https://render.com), root directory `backend`
2. Build command: `npm ci` — Start command: `npm start`
3. Add environment variables (`DATABASE_URL`, `GEMINI_API_KEY`, etc.)
4. Render injects `RENDER_EXTERNAL_URL` automatically — Swagger picks it up with no extra config

### Frontend → Vercel

Import the repo on [vercel.com](https://vercel.com), set the root directory to `frontend`, deploy. Done.

### Monitoring cron → GitHub Actions

Add a repository secret `BACKEND_URL` (your Render URL) under **Settings → Secrets and variables → Actions**. The workflow at `.github/workflows/monitoring-cron.yml` will trigger the ping endpoint every five minutes from GitHub's infrastructure. You can also run it manually from the **Actions** tab.
