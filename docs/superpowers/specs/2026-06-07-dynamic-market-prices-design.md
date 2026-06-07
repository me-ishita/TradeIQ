# Dynamic Market Prices — Design Spec
Date: 2026-06-07

## Problem

All market prices shown across the app are hardcoded static strings in `constants.ts` and individual page files. This means prices are always stale and must be manually updated in code. Affected locations:

| File | Static data |
|---|---|
| `constants.ts` | `tickers` array (10 symbols), `perfData`, `benchmarkData` |
| `dashboard.tsx` | 4 Indian market index rows (NIFTY 50, SENSEX, NIFTY IT, NIFTY PHARMA) |
| `portfolio-builder.tsx` | `const totalCapital = 10000` |
| `main-app.tsx` | Portfolio score `78`, learning completion `67` |

## Scope (Option A)

Replace **market prices and user portfolio/score data** with live backend fetches. Course progress and competition config (fees, prize pool) remain static.

## Architecture

Two layers of change:

### Backend — 1 new endpoint

**`GET /market/indices`** (JWT required)

Fetches current price and % change for 14 tickers using the existing `YahooFinancePipeline`. Each ticker uses `yf.Ticker(t).history(period="2d")` to compute:
- `price` = last row Close, formatted as string
- `change_pct` = `(today_close - prev_close) / prev_close * 100`
- `up` = change_pct >= 0

Tickers served:

| Display name | Yahoo ticker |
|---|---|
| S&P 500 | `^GSPC` |
| NASDAQ | `^IXIC` |
| DOW | `^DJI` |
| AAPL | `AAPL` |
| MSFT | `MSFT` |
| NVDA | `NVDA` |
| AMZN | `AMZN` |
| TSLA | `TSLA` |
| USD/INR | `INR=X` |
| GOLD | `GC=F` |
| NIFTY 50 | `^NSEI` |
| SENSEX | `^BSESN` |
| NIFTY IT | `^CNXIT` |
| NIFTY PHARMA | `^CNXPHARMA` |

**Response shape:**
```json
{
  "indices": [
    { "name": "S&P 500", "ticker": "^GSPC", "price": "5,312.00", "change": "+0.46%", "up": true }
  ]
}
```

**Error handling:** If a single ticker fails (network, delisted), it is skipped from the response rather than failing the whole endpoint. The frontend falls back to hiding that row rather than crashing.

### Frontend — 1 new store + 4 component updates

#### `src/native/market-store.ts` (new)

Module-level in-memory cache. Single fetch per session; subsequent callers receive cached data immediately.

```ts
export type MarketIndex = { name: string; ticker: string; price: string; change: string; up: boolean }

let _cache: MarketIndex[] | null = null

export async function getMarketIndices(): Promise<MarketIndex[]>
  // returns _cache if populated, else fetches /market/indices and caches
```

#### `src/native/api.ts`

Add `getIndices()` to the `market` object:
```ts
getIndices(): Promise<{ indices: MarketIndex[] }>
```

#### `MarketTicker` component

- `useEffect` on mount → `getMarketIndices()`
- Loading state: show placeholder dashes (`—`) while fetching
- Loaded: scroll live prices exactly as before

#### `dashboard.tsx` — market tab

- Remove hardcoded `[["NIFTY 50", "24,386", ...]]` array (lines 120–123)
- `useEffect` → `getMarketIndices()` (hits cache if `MarketTicker` already called it)
- Filter to 4 tickers: `^NSEI`, `^BSESN`, `^CNXIT`, `^CNXPHARMA`
- Same render loop and UI

#### `portfolio-builder.tsx`

- Remove `const totalCapital = 10000` (line 12)
- `useEffect` → `portfolio.getSummary(userData.studentId)` on mount
- Use `summary.total_capital` for capital display and allocation math
- Graceful fallback to `10000` while loading or on fetch error

#### `main-app.tsx` — profile modal

- `Progress label="Portfolio score" value={78}` → lazy fetch `analytics.getScores(studentId)` when modal opens
- Display the `final_score` of the highest `week_number` entry
- `Progress label="Learning completion" value={67}` → stays static (out of Option A scope)

#### `constants.ts`

- Remove exports: `tickers`, `perfData`, `benchmarkData`
- All other exports unchanged (colors, fonts, glossary, `assetOptions`, `sectorOptions`)

## Data flow summary

```
App boot
  └── MarketTicker mounts
        └── getMarketIndices() → GET /market/indices (yfinance, 14 tickers)
              └── _cache populated

Dashboard "market" tab opened
  └── getMarketIndices() → returns _cache immediately
        └── filter to 4 Indian indices → render rows

PortfolioBuilder mounts
  └── portfolio.getSummary(studentId) → GET /portfolio/summary/:id
        └── total_capital drives capital display + allocation math

Profile modal opened
  └── analytics.getScores(studentId) → GET /analytics/scores/:id
        └── latest week final_score → portfolio score progress bar
```

## Existing endpoints reused (no changes needed)

| Data | Endpoint | Field |
|---|---|---|
| Portfolio capital | `GET /portfolio/summary/:userId` | `total_capital` |
| Portfolio score | `GET /analytics/scores/:userId` | latest week `final_score` |

## What stays static

- Course progress percentages in `courses.tsx` and `main-app.tsx` learning completion bar
- Competition prize pool and course fees in `leaderboard.tsx` and `payment-page.tsx`
- Glossary numeric examples (educational text, not live data)
- Form field placeholder text (`$10,000`, `$2,000` hints)

## Files changed

**Backend:**
- `backend/app/market/routes.py` — add `/market/indices` route

**Frontend:**
- `frontend/DRA App/src/native/api.ts` — add `market.getIndices()`
- `frontend/DRA App/src/native/market-store.ts` — new file
- `frontend/DRA App/src/native/constants.ts` — remove `tickers`, `perfData`, `benchmarkData`
- `frontend/DRA App/src/native/components/market-ticker.tsx` — use store
- `frontend/DRA App/src/native/pages/dashboard.tsx` — market tab uses store
- `frontend/DRA App/src/native/pages/portfolio-builder.tsx` — capital from summary
- `frontend/DRA App/src/native/pages/main-app.tsx` — score from analytics
