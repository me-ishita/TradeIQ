# Dynamic Market Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded market prices, portfolio capital, and user score values with live data fetched from the backend.

**Architecture:** Add one new Flask endpoint (`GET /market/indices`) that batches 14 ticker price+change lookups via yfinance; add a frontend `market-store.ts` that caches the response for the session; update 6 components/pages to consume live data instead of static constants.

**Tech Stack:** Python/Flask + yfinance (backend), TypeScript/React Native/Expo (frontend)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/app/market/routes.py` | Add `/market/indices` endpoint |
| Modify | `frontend/DRA App/src/native/api.ts` | Add `MarketIndex` type + `market.getIndices()` + `market.getBenchmark()` |
| **Create** | `frontend/DRA App/src/native/market-store.ts` | Session cache for market indices |
| Modify | `frontend/DRA App/src/native/constants.ts` | Remove `tickers`, `perfData`, `benchmarkData` |
| Modify | `frontend/DRA App/src/native/components/charts.tsx` | Accept `perfData`/`benchmarkData` as props |
| Modify | `frontend/DRA App/src/native/components/market-ticker.tsx` | Use store instead of static array |
| Modify | `frontend/DRA App/src/native/pages/dashboard.tsx` | Market tab + chart from live data |
| Modify | `frontend/DRA App/src/native/pages/portfolio-builder.tsx` | Capital from `/portfolio/summary` |
| Modify | `frontend/DRA App/src/native/pages/main-app.tsx` | Score from `/analytics/scores` |

---

## Task 1: Backend — `/market/indices` endpoint

**Files:**
- Modify: `backend/app/market/routes.py`

- [ ] **Step 1: Add the indices constant and route**

Open `backend/app/market/routes.py`. Add the `INDICES` list and new route **after** the existing `/market/price/<ticker>` route (after line 109):

```python
# ─────────────────────────────────────────
# Index/ticker definitions
# ─────────────────────────────────────────

INDICES = [
    {"name": "S&P 500",       "ticker": "^GSPC"},
    {"name": "NASDAQ",        "ticker": "^IXIC"},
    {"name": "DOW",           "ticker": "^DJI"},
    {"name": "AAPL",          "ticker": "AAPL"},
    {"name": "MSFT",          "ticker": "MSFT"},
    {"name": "NVDA",          "ticker": "NVDA"},
    {"name": "AMZN",          "ticker": "AMZN"},
    {"name": "TSLA",          "ticker": "TSLA"},
    {"name": "USD/INR",       "ticker": "INR=X"},
    {"name": "GOLD",          "ticker": "GC=F"},
    {"name": "NIFTY 50",      "ticker": "^NSEI"},
    {"name": "SENSEX",        "ticker": "^BSESN"},
    {"name": "NIFTY IT",      "ticker": "^CNXIT"},
    {"name": "NIFTY PHARMA",  "ticker": "^CNXPHARMA"},
]


# ─────────────────────────────────────────
# GET /market/indices
# Returns: price + % change for all tracked indices/tickers
# ─────────────────────────────────────────

@market_bp.get("/indices")
@jwt_required()
def get_indices():
    import yfinance as yf
    results = []
    for entry in INDICES:
        try:
            hist = yf.Ticker(entry["ticker"]).history(period="5d")
            if hist.empty or len(hist) < 2:
                continue
            today_close = float(hist["Close"].iloc[-1])
            prev_close  = float(hist["Close"].iloc[-2])
            change_pct  = (today_close - prev_close) / prev_close * 100
            price_str   = f"{today_close:,.0f}" if today_close >= 1000 else f"{today_close:,.2f}"
            change_str  = f"{'+' if change_pct >= 0 else ''}{change_pct:.2f}%"
            results.append({
                "name":   entry["name"],
                "ticker": entry["ticker"],
                "price":  price_str,
                "change": change_str,
                "up":     change_pct >= 0,
            })
        except Exception:
            continue
    return jsonify({"indices": results}), 200
```

- [ ] **Step 2: Verify the endpoint works**

With the Docker containers running:

```bash
# Get a JWT token first
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

# Call the new endpoint
curl -s http://localhost:5000/market/indices \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
```

Expected: JSON with `"indices"` array, each item having `name`, `ticker`, `price`, `change`, `up`. Verify S&P 500 price is NOT `5,289` (it should reflect today's actual price).

- [ ] **Step 3: Commit**

```bash
git add backend/app/market/routes.py
git commit -m "feat: add GET /market/indices endpoint with live yfinance prices"
```

---

## Task 2: Frontend — extend `api.ts` with new types and methods

**Files:**
- Modify: `frontend/DRA App/src/native/api.ts`

- [ ] **Step 1: Add `MarketIndex` type after the existing type definitions**

In `api.ts`, after the `StockSearchResult` type (around line 166), add:

```ts
export type MarketIndex = {
  name: string;
  ticker: string;
  price: string;
  change: string;
  up: boolean;
};
```

- [ ] **Step 2: Add `getIndices` and `getBenchmark` to the `market` object**

Replace the existing `market` export (lines 168–176) with:

```ts
export const market = {
  getPrice(ticker: string): Promise<MarketPrice> {
    return apiFetch<MarketPrice>(`/market/price/${ticker}`);
  },

  search(query: string): Promise<{ results: StockSearchResult[] }> {
    return apiFetch(`/market/search?q=${encodeURIComponent(query)}`);
  },

  getIndices(): Promise<{ indices: MarketIndex[] }> {
    return apiFetch<{ indices: MarketIndex[] }>("/market/indices");
  },

  getBenchmark(start: string, end: string): Promise<{ benchmark: { Date: string; Close: number }[] }> {
    return apiFetch<{ benchmark: { Date: string; Close: number }[] }>(
      `/market/benchmark?start=${start}&end=${end}`
    );
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/api.ts"
git commit -m "feat: add MarketIndex type, getIndices and getBenchmark to api.ts"
```

---

## Task 3: Frontend — create `market-store.ts`

**Files:**
- Create: `frontend/DRA App/src/native/market-store.ts`

- [ ] **Step 1: Create the store file**

```ts
import { market } from "./api";
import type { MarketIndex } from "./api";

let _cache: MarketIndex[] | null = null;

export async function getMarketIndices(): Promise<MarketIndex[]> {
  if (_cache) return _cache;
  const data = await market.getIndices();
  _cache = data.indices;
  return _cache;
}

export function clearMarketCache(): void {
  _cache = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/DRA App/src/native/market-store.ts"
git commit -m "feat: add market-store with session-cached getMarketIndices"
```

---

## Task 4: Frontend — update `MarketTicker` to use store

**Files:**
- Modify: `frontend/DRA App/src/native/components/market-ticker.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { C, font } from "../constants";
import { getMarketIndices } from "../market-store";
import type { MarketIndex } from "../api";

export function MarketTicker() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getMarketIndices()
      .then(setIndices)
      .catch(() => setIndices([]));
  }, []);

  useEffect(() => {
    if (indices.length === 0) return;
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -920,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX, indices]);

  if (indices.length === 0) {
    return (
      <View
        style={{
          height: 38,
          overflow: "hidden",
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: "rgba(5,8,18,0.96)",
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: C.text2, fontSize: 12, fontFamily: font.mono }}>
          Loading market data…
        </Text>
      </View>
    );
  }

  const row = [...indices, ...indices, ...indices, ...indices];

  return (
    <View
      style={{
        height: 38,
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        backgroundColor: "rgba(5,8,18,0.96)",
      }}
    >
      <Animated.View
        style={{ flexDirection: "row", alignItems: "center", height: 38, transform: [{ translateX }] }}
      >
        {row.map((ticker, index) => (
          <View
            key={`${ticker.name}-${index}`}
            style={{ height: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 28 }}
          >
            <Text selectable style={{ color: C.text1, fontSize: 12, fontFamily: font.medium }}>
              {ticker.name}
            </Text>
            <Text selectable style={{ color: C.text0, fontSize: 13, fontFamily: font.mono }}>
              {ticker.price}
            </Text>
            <Text selectable style={{ color: ticker.up ? C.green : C.red, fontSize: 12, fontFamily: font.mono }}>
              {ticker.change}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start the app (`docker-compose up` or `npx expo start` in the frontend directory). Open `http://localhost:8081`. After login, the ticker bar above the logo should show live prices (not `5,289` for S&P 500).

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/components/market-ticker.tsx"
git commit -m "feat: market-ticker fetches live prices from market-store"
```

---

## Task 5: Frontend — remove static data from `constants.ts`

**Files:**
- Modify: `frontend/DRA App/src/native/constants.ts`

- [ ] **Step 1: Remove the three static exports**

Delete lines 32–46 from `constants.ts` (the `tickers`, `perfData`, and `benchmarkData` exports). The file should go directly from `brandLogo`/`prizePoolImage`/`backgrounds` down to `assetOptions`.

The section to delete:

```ts
export const tickers = [
  { name: "S&P 500", price: "5,289", change: "+0.46%", up: true },
  { name: "NASDAQ", price: "17,019", change: "+0.83%", up: true },
  { name: "DOW", price: "38,686", change: "-0.12%", up: false },
  { name: "AAPL", price: "201.00", change: "+1.18%", up: true },
  { name: "MSFT", price: "425.52", change: "+0.62%", up: true },
  { name: "NVDA", price: "1,096.33", change: "+2.04%", up: true },
  { name: "AMZN", price: "181.28", change: "-0.28%", up: false },
  { name: "TSLA", price: "176.19", change: "+0.91%", up: true },
  { name: "USD/INR", price: "83.42", change: "-0.09%", up: false },
  { name: "GOLD", price: "2,342", change: "+0.41%", up: true },
] as const;

export const perfData = [10000, 10140, 10380, 10620, 10580, 10720, 10810];
export const benchmarkData = [10000, 10090, 10220, 10380, 10410, 10480, 10510];
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/DRA App/src/native/constants.ts"
git commit -m "refactor: remove static tickers, perfData, benchmarkData from constants"
```

---

## Task 6: Frontend — update `LineChart` to accept props

**Files:**
- Modify: `frontend/DRA App/src/native/components/charts.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { Text, View } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { C, font } from "../constants";

export function LineChart({
  perfData,
  benchmarkData,
}: {
  perfData: number[];
  benchmarkData: number[];
}) {
  const width = 320;
  const height = 150;

  if (perfData.length < 2 || benchmarkData.length < 2) {
    return (
      <Svg width="100%" height={190} viewBox={`0 0 ${width} ${height + 40}`}>
        <Polyline
          points={`0,${height / 2} ${width},${height / 2}`}
          fill="none"
          stroke={C.border}
          strokeWidth={2}
          strokeDasharray="6 6"
        />
      </Svg>
    );
  }

  const allValues = [...perfData, ...benchmarkData];
  const min = Math.min(...allValues) * 0.99;
  const max = Math.max(...allValues) * 1.01;

  const points = (data: number[]) =>
    data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / (max - min)) * height;
        return `${x},${y}`;
      })
      .join(" ");

  const areaPath = `M0,${height} L${points(perfData).replaceAll(" ", " L")} L${width},${height} Z`;

  return (
    <Svg width="100%" height={190} viewBox={`0 0 ${width} ${height + 40}`}>
      <Path d={areaPath} fill="rgba(49,230,255,0.13)" />
      <Polyline
        points={points(benchmarkData)}
        fill="none"
        stroke={C.text2}
        strokeWidth={2}
        strokeDasharray="6 6"
      />
      <Polyline
        points={points(perfData)}
        fill="none"
        stroke={C.cyan}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {perfData.map((value, index) => {
        const x = (index / (perfData.length - 1)) * width;
        const y = height - ((value - min) / (max - min)) * height;
        return <Circle key={index} cx={x} cy={y} r={4} fill={C.cyan} />;
      })}
    </Svg>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text selectable style={{ color: C.text2, fontFamily: font.regular, fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/DRA App/src/native/components/charts.tsx"
git commit -m "refactor: LineChart accepts perfData and benchmarkData as props"
```

---

## Task 7: Frontend — update `dashboard.tsx` (market tab + chart)

**Files:**
- Modify: `frontend/DRA App/src/native/pages/dashboard.tsx`

- [ ] **Step 1: Update imports**

Replace the existing import block at the top of `dashboard.tsx`:

```tsx
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { C, font } from "../constants";
import { market, portfolio } from "../api";
import type { MarketIndex, PortfolioSummary } from "../api";
import { Legend, LineChart } from "../components/charts";
import { GlassCard, Progress, SectionTitle } from "../components/ui";
import { getMarketIndices } from "../market-store";
```

- [ ] **Step 2: Add helper functions before the component**

Add these two pure functions after the imports, before `StatCard`:

```ts
const CHART_POINTS = 7;
const INDIAN_TICKERS = ["^NSEI", "^BSESN", "^CNXIT", "^CNXPHARMA"];

function sampleAndNormalize(records: { Close: number }[], points: number): number[] {
  if (records.length === 0) return [];
  const step = Math.max(1, Math.floor((records.length - 1) / (points - 1)));
  const sampled: number[] = [];
  for (let i = 0; i < points - 1; i++) {
    sampled.push(records[Math.min(i * step, records.length - 1)].Close);
  }
  sampled.push(records[records.length - 1].Close);
  const base = sampled[0];
  return sampled.map((c) => Math.round((c / base) * 10000));
}

function portfolioLine(startCapital: number, currentValue: number, points: number): number[] {
  const step = (currentValue - startCapital) / (points - 1);
  return Array.from({ length: points }, (_, i) => Math.round(startCapital + step * i));
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
```

- [ ] **Step 3: Add state for market indices and chart data inside `Dashboard`**

Inside the `Dashboard` component, after the existing `useState` and `useEffect` for portfolio summary, add:

```tsx
const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
const [chartPerf, setChartPerf] = useState<number[]>([]);
const [chartBench, setChartBench] = useState<number[]>([]);

useEffect(() => {
  getMarketIndices()
    .then(setMarketIndices)
    .catch(() => setMarketIndices([]));
}, []);

useEffect(() => {
  if (!studentId) return;
  const end = new Date();
  const start = new Date(end.getTime() - 49 * 24 * 60 * 60 * 1000);
  market
    .getBenchmark(isoDate(start), isoDate(end))
    .then((data) => setChartBench(sampleAndNormalize(data.benchmark, CHART_POINTS)))
    .catch(() => setChartBench([]));
}, [studentId]);

useEffect(() => {
  if (!summary) return;
  setChartPerf(portfolioLine(summary.total_capital, summary.total_portfolio, CHART_POINTS));
}, [summary]);
```

- [ ] **Step 4: Replace the hardcoded market tab section**

Find and replace the hardcoded `[["NIFTY 50", "24,386", ...]]` block (the `{tab === "market" ? ...}` section) with:

```tsx
{tab === "market" ? (
  <GlassCard style={{ padding: 16, gap: 8 }} accent={C.cyan}>
    {marketIndices
      .filter((idx) => INDIAN_TICKERS.includes(idx.ticker))
      .map((idx) => (
        <View
          key={idx.ticker}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            borderBottomColor: C.border,
            borderBottomWidth: 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {idx.up ? (
              <TrendingUp size={15} color={C.green} />
            ) : (
              <TrendingDown size={15} color={C.red} />
            )}
            <Text selectable style={{ color: C.text1, fontFamily: font.medium, fontSize: 13 }}>
              {idx.name}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 13 }}>
              {idx.price}
            </Text>
            <Text
              selectable
              style={{ color: idx.up ? C.green : C.red, fontFamily: font.mono, fontSize: 11 }}
            >
              {idx.change}
            </Text>
          </View>
        </View>
      ))}
    {marketIndices.filter((idx) => INDIAN_TICKERS.includes(idx.ticker)).length === 0 && (
      <Text style={{ color: C.text2, fontSize: 12 }}>Loading indices…</Text>
    )}
  </GlassCard>
) : null}
```

- [ ] **Step 5: Pass chart data as props to `LineChart`**

Find the existing `<LineChart />` (no props) and replace it with:

```tsx
<LineChart perfData={chartPerf} benchmarkData={chartBench} />
```

- [ ] **Step 6: Verify in browser**

Open the dashboard → "market" tab. Verify NIFTY 50, SENSEX, NIFTY IT, NIFTY PHARMA show live prices with correct up/down indicator. Open "overview" tab and verify the chart renders (may show flat placeholder until portfolio + benchmark data loads).

- [ ] **Step 7: Commit**

```bash
git add "frontend/DRA App/src/native/pages/dashboard.tsx"
git commit -m "feat: dashboard market tab and chart use live data from backend"
```

---

## Task 8: Frontend — dynamic capital in `portfolio-builder.tsx`

**Files:**
- Modify: `frontend/DRA App/src/native/pages/portfolio-builder.tsx`

- [ ] **Step 1: Remove the module-level constant**

Delete line 12:
```ts
const totalCapital = 10000;   // ← delete this line
```

- [ ] **Step 2: Update `makeTrade` to accept a capital parameter**

Change the `makeTrade` signature and its `amountInvested` default:

```ts
function makeTrade(studentId: string, index: number, capital: number): Position {
  return {
    id: `${Date.now()}-${index}`,
    tradeId: `TRD${String(index + 1).padStart(6, "0")}`,
    studentId,
    addedBy: studentId,
    tradeDate: today(),
    stockTicker: "",
    stockName: "",
    sector: "Technology",
    allocationPercent: 10,
    amountInvested: `$${Math.round(capital * 0.1).toLocaleString()}`,
    buyPrice: "",
    currentSellPrice: "",
    tradeType: "Buy",
    tag1: "Earnings Play",
    tag2: "Macro Tailwind",
    tag3: "(optional)",
    thesis: "",
  };
}
```

- [ ] **Step 3: Add state and fetch inside `PortfolioBuilder`**

At the top of the `PortfolioBuilder` component (after the existing `useState` declarations), add:

```tsx
const [capitalAmount, setCapitalAmount] = useState(10000);

useEffect(() => {
  if (!userData?.studentId) return;
  portfolio.getSummary(userData.studentId)
    .then((s) => {
      setCapitalAmount(s.total_capital);
      setSetup((prev) => ({ ...prev, totalCapital: `$${s.total_capital.toLocaleString()}` }));
    })
    .catch(() => {});
}, [userData?.studentId]);
```

- [ ] **Step 4: Update all call sites that use `makeTrade` to pass `capitalAmount`**

Three call sites need the capital argument added:

1. Initial state (line ~190):
```tsx
const [positions, setPositions] = useState<Position[]>([makeTrade(studentId, 0, capitalAmount)]);
```

2. Inside the draft-restore `useEffect` (line ~219):
```tsx
setPositions([makeTrade(studentId, 0, capitalAmount)]);
```

3. `addPosition` function:
```tsx
const addPosition = () =>
  setPositions((prev) => [...prev, makeTrade(studentId, prev.length, capitalAmount)]);
```

- [ ] **Step 5: Replace `totalCapital` with `capitalAmount` in `updatePosition`**

In `updatePosition`, change the allocation math line:

```tsx
if (field === "allocationPercent")
  next.amountInvested = `$${Math.round((capitalAmount * Number(value || 0)) / 100).toLocaleString()}`;
```

- [ ] **Step 6: Verify in browser**

Open the Portfolio tab. The "Total Capital" field should show the value from the backend (`total_capital` from your portfolio summary). Adjusting allocation % on any position should compute the `$` amount based on the live capital, not the hardcoded `$10,000`.

- [ ] **Step 7: Commit**

```bash
git add "frontend/DRA App/src/native/pages/portfolio-builder.tsx"
git commit -m "feat: portfolio-builder fetches capital from /portfolio/summary"
```

---

## Task 9: Frontend — dynamic portfolio score in `main-app.tsx`

**Files:**
- Modify: `frontend/DRA App/src/native/pages/main-app.tsx`

- [ ] **Step 1: Add `analytics` import**

In the imports at the top of `main-app.tsx`, add:

```tsx
import { analytics } from "../api";
import type { BackendWeeklyScore } from "../api";
```

- [ ] **Step 2: Add state and lazy fetch inside `MainApp`**

Inside the `MainApp` component, after the existing `useState` declarations, add:

```tsx
const [portfolioScore, setPortfolioScore] = useState<number | null>(null);

useEffect(() => {
  if (!profileOpen || portfolioScore !== null) return;
  analytics
    .getScores(studentId)
    .then((data) => {
      if (data.scores.length === 0) {
        setPortfolioScore(0);
        return;
      }
      const latest = data.scores.reduce((max: BackendWeeklyScore, s: BackendWeeklyScore) =>
        s.week_number > max.week_number ? s : max
      );
      setPortfolioScore(Math.round(latest.final_score));
    })
    .catch(() => setPortfolioScore(0));
}, [profileOpen, studentId, portfolioScore]);
```

- [ ] **Step 3: Replace hardcoded score value**

Find line 111:
```tsx
<Progress label="Portfolio score" value={78} color={C.cyan} />
```

Replace with:
```tsx
<Progress label="Portfolio score" value={portfolioScore ?? 0} color={C.cyan} />
```

Leave `value={67}` for "Learning completion" unchanged (out of scope for Option A).

- [ ] **Step 4: Verify in browser**

Open the app → tap your avatar/initials in the top-right to open the profile modal. The "Portfolio score" progress bar should reflect the latest `final_score` from the analytics API (will be `0` if no scores exist yet, not `78`).

- [ ] **Step 5: Commit**

```bash
git add "frontend/DRA App/src/native/pages/main-app.tsx"
git commit -m "feat: profile modal fetches live portfolio score from analytics API"
```

---

## Final verification checklist

- [ ] Ticker bar above logo shows live prices (not the static `5,289` for S&P 500)
- [ ] Dashboard "market" tab shows NIFTY 50, SENSEX, NIFTY IT, NIFTY PHARMA with live prices and correct up/down arrows
- [ ] Dashboard "overview" chart renders with live benchmark line
- [ ] Portfolio Builder "Total Capital" reflects actual value from backend
- [ ] Profile modal "Portfolio score" reflects actual analytics score
- [ ] No TypeScript errors: run `npx tsc --noEmit` inside `frontend/DRA App/`
- [ ] `constants.ts` no longer exports `tickers`, `perfData`, or `benchmarkData`
