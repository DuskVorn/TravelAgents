# DuskvorN

AI travel intelligence platform — flights, private jets, hotels, and cars, ranked together by a multi-agent
backend and surfaced through a single search on the dashboard.

## File tree

```
duskvorn/
├── .env.example
├── .gitignore
├── package.json                 # npm workspaces root: build / zip / push / build:all
├── tsconfig.json                 # config for running scripts/ via ts-node
├── README.md
│
├── apps/
│   ├── api/                      # Express + TypeScript backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── railway.json          # Railway deploy config
│   │   └── src/
│   │       ├── index.ts          # app entry point
│   │       ├── lib/userStore.ts  # in-memory user/subscription store
│   │       ├── middleware/
│   │       │   ├── identifyUser.ts
│   │       │   └── errorHandler.ts
│   │       ├── routes/
│   │       │   ├── search.ts     # POST /api/search
│   │       │   ├── plans.ts      # GET  /api/plans
│   │       │   └── billing.ts    # /api/billing/checkout, /me, webhook handler
│   │       └── stripe/plans.ts   # Stripe client + tier<->price mapping
│   │
│   └── web/                      # Next.js dashboard
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── vercel.json           # Vercel deploy config
│       ├── next-env.d.ts
│       ├── lib/api.ts            # typed fetch client for the API
│       ├── styles/globals.css    # design tokens (brand palette, type, layout)
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── SearchForm.tsx
│       │   ├── ResultsTabs.tsx   # flights / jets / hotels / cars tabs
│       │   └── PaywallModal.tsx
│       └── pages/
│           ├── _app.tsx
│           ├── index.tsx         # dashboard: hero + search + results
│           └── pricing.tsx       # subscription page (free/pro/elite)
│
├── packages/
│   ├── core/                     # shared types + ranking engine
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/{types,ranking,random,index}.ts
│   │
│   └── agents/                   # multi-agent system
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── BaseAgent.ts          # shared live-call → mock fallback helper
│           ├── FlightAgent.ts        # Amadeus integration + mock fares
│           ├── JetAgent.ts           # charter-partner integration + mock charters
│           ├── HotelAgent.ts         # Booking-style integration + mock stays
│           ├── CarAgent.ts           # rental-provider integration + mock cars
│           ├── OrchestratorAgent.ts  # parallel fan-out, merge, tier gating, summary
│           └── index.ts
│
└── scripts/
    ├── export-zip.ts             # zips the repo to dist/duskvorn.zip
    └── push-github.ts            # git init/add/commit/push automation
```

## How the search works

1. The frontend posts `SearchParams` to `POST /api/search` with an `x-user-id` header (auto-generated and
   stored in `localStorage` on first visit).
2. `identifyUser` middleware loads (or creates) that user's record — tier, daily search count — from the
   in-memory store.
3. The route checks `PLAN_LIMITS[tier].searchesPerDay`. If the user is over their daily limit, it throws a
   `402` with a clear message, which the frontend turns into the paywall modal.
4. `OrchestratorAgent.search()` runs `FlightAgent`, `HotelAgent`, `CarAgent` in parallel via `Promise.all`,
   plus `JetAgent` only when the user's tier is `elite` (jets are never fetched for lower tiers, to avoid
   wasted provider calls — not just hidden in the UI).
5. Every agent tries its real provider first (Amadeus for flights, a configurable charter API for jets, a
   Booking-style API for hotels, a rental API for cars). **If the relevant API key is missing, the call
   times out, or the provider errors, the agent falls back to a deterministic mock generator** seeded from
   the search query — so results are always returned and are stable across refreshes of the same query.
6. All results are scored 0–100 by `@duskvorn/core`'s `rankResults()` (weighted: 45% price, 30% time, 25%
   comfort) and sorted before being returned.
7. The orchestrator also produces a one-line `summary` — via OpenAI if `OPENAI_API_KEY` is set, otherwise a
   deterministic rule-based sentence.

## Subscription tiers

| Tier  | Price  | Searches/day | Jets |
|-------|--------|--------------|------|
| Free  | $0     | 5            | ✕    |
| Pro   | $19/mo | 100          | ✕    |
| Elite | $49/mo | 1000         | ✓    |

Checkout is handled via Stripe Checkout Sessions (`POST /api/billing/checkout`); the webhook
(`POST /api/billing/webhook`) listens for `checkout.session.completed`, `customer.subscription.updated`, and
`customer.subscription.deleted` to keep each user's tier in sync.

> The user store (`apps/api/src/lib/userStore.ts`) is in-memory by design, so the whole stack runs with zero
> external dependencies out of the box. Swap it for Postgres/Prisma or Redis in production — every other
> module only calls its exported functions, so the storage swap is isolated to that one file.

## Run instructions

### 1. Install

```bash
cd duskvorn
npm install
cp .env.example .env
```

Fill in `.env` with whatever you have — the app runs fully on mock data with **no keys set at all**.

### 2. Build the shared packages once

```bash
npm run build --workspace=packages/core
npm run build --workspace=packages/agents
```

### 3. Run the backend and frontend (two terminals)

```bash
npm run dev:api   # http://localhost:3000
npm run dev:web   # http://localhost:3001 (Next.js will pick the next free port)
```

Open the web app, run a search — flights/hotels/cars return mock data immediately. Jets unlock once a user's
tier is `elite` (use the Stripe test flow below, or call `setUserTier` directly while developing).

### 4. Stripe (optional, for real billing)

1. Create two recurring Prices in Stripe ($19 and $49/mo) and put their IDs in `STRIPE_PRICE_ID_PRO` /
   `STRIPE_PRICE_ID_ELITE`.
2. Put your secret key in `STRIPE_SECRET_KEY`.
3. Forward webhooks locally: `stripe listen --forward-to localhost:3000/api/billing/webhook` and copy the
   printed signing secret into `STRIPE_WEBHOOK_SECRET`.

### 5. Production build, zip export, and GitHub push

```bash
npm run build       # builds core, agents, api, web
npm run zip          # -> dist/duskvorn.zip ("ZIP CREATED SUCCESSFULLY")
GITHUB_REPO_URL=https://github.com/your-org/duskvorn.git npm run push
```

Or run all three in sequence:

```bash
npm run build:all
```

### 6. Deploy

- **API → Railway**: point a Railway service at `apps/api` (the included `railway.json` sets the build and
  start commands). Add the `.env` variables in the Railway dashboard.
- **Web → Vercel**: import the repo, set the project root to `apps/web` (the included `vercel.json` handles
  building the monorepo dependency chain first). Set `NEXT_PUBLIC_API_URL` to your deployed Railway URL.
