# Frontend–Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Expo web frontend to the Flask REST backend with JWT auth, and containerise MySQL + Flask + Expo web in Docker Compose.

**Architecture:** A thin `api.ts` module owns all HTTP communication with Flask at `http://localhost:5000`. `auth-store.ts` delegates register/login to the API and stores the JWT in localStorage. The `SignInPage` switches from student-ID to email (matching `/auth/login`). Dashboard, Leaderboard, and Scores fetch live data on mount. Portfolio Submit calls `executeTrade` for each position. Docker Compose wires all three containers together.

**Tech Stack:** TypeScript, Expo (web only), React Native, Flask, MySQL, Docker Compose.

---

## File Map

**Create:**
- `frontend/DRA App/src/native/api.ts` — API client: token helpers, base fetch, auth/portfolio/market/analytics namespaces
- `backend/Dockerfile` — Python 3.11-slim, installs requirements, runs entrypoint
- `backend/entrypoint.sh` — waits for MySQL TCP socket, then starts Flask
- `backend/.dockerignore` — excludes venv, pycache, .env
- `frontend/DRA App/Dockerfile` — Node 20-slim, installs npm deps, starts Expo web
- `frontend/DRA App/.dockerignore` — excludes node_modules, .expo

**Modify:**
- `frontend/DRA App/src/native/auth-store.ts` — replace local-only auth with API calls + token management
- `frontend/DRA App/src/native/pages/sign-in-page.tsx` — email field instead of student ID
- `frontend/DRA App/src/native/challenge-app.tsx` — remove `setActiveStudentId` call after sign-in; pass email to `signInUser`
- `frontend/DRA App/src/native/pages/dashboard.tsx` — useEffect fetches `portfolio.getSummary()`
- `frontend/DRA App/src/native/pages/portfolio-builder.tsx` — add `submitToBackend()` called by Submit button
- `frontend/DRA App/src/native/pages/leaderboard.tsx` — useEffect fetches `analytics.getLeaderboard()`
- `frontend/DRA App/src/native/pages/scores.tsx` — useEffect fetches `analytics.getScores()`
- `docker-compose.yml` — add backend and frontend services

---

## Task 1: Create API client

**Files:**
- Create: `frontend/DRA App/src/native/api.ts`

- [ ] **Step 1: Create `api.ts` with token helpers, base fetch, and all endpoint namespaces**

Create file `frontend/DRA App/src/native/api.ts` with this complete content:

```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Token storage ──────────────────────────────────────────────────────────────
const TOKEN_KEY = "dra.jwtToken";

export function getToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setToken(token: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

// ── Base fetch ─────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export type BackendUser = {
  user_id: string;
  full_name: string;
  email: string;
  university: string | null;
  course: string | null;
  year_of_study: number | null;
  participation_type: string | null;
  team_name: string | null;
  role: string;
};

type AuthResponse = { message: string; user: BackendUser; token: string };

export const auth = {
  register(payload: {
    full_name: string;
    email: string;
    password: string;
    age?: number;
    date_of_birth?: string;
    phone_number?: string;
    university?: string;
    course?: string;
    year_of_study?: number;
    participation_type?: string;
    team_name?: string;
  }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
};

// ── Portfolio ──────────────────────────────────────────────────────────────────
export type PortfolioSummary = {
  user_id: string;
  total_capital: number;
  cash_balance: number;
  holdings_value: number;
  total_portfolio: number;
  total_pnl: number;
  total_return_pct: number;
  holdings_count: number;
};

export type BackendTrade = {
  trade_id: string;
  user_id: string;
  trade_date: string;
  stock_ticker: string;
  stock_name: string;
  sector: string | null;
  allocation_percent: number;
  amount_invested: number;
  quantity: number;
  buy_price: number;
  current_sell_price: number;
  trade_type: "BUY" | "SELL";
  tag1: string | null;
  tag2: string | null;
  tag3: string | null;
  thesis: string | null;
};

export const portfolio = {
  getSummary(userId: string): Promise<PortfolioSummary> {
    return apiFetch<PortfolioSummary>(`/portfolio/summary/${userId}`);
  },

  getTrades(userId: string): Promise<{ user_id: string; trades: BackendTrade[]; count: number }> {
    return apiFetch(`/portfolio/trades/${userId}`);
  },

  executeTrade(payload: {
    stock_ticker: string;
    trade_type: "BUY" | "SELL";
    quantity: number;
    tag1?: string;
    tag2?: string;
    tag3?: string;
    thesis?: string;
  }): Promise<{ message: string; trade: BackendTrade; cash_balance: number }> {
    return apiFetch("/portfolio/trade", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ── Market ─────────────────────────────────────────────────────────────────────
export type MarketPrice = { ticker: string; price: number };

export const market = {
  getPrice(ticker: string): Promise<MarketPrice> {
    return apiFetch<MarketPrice>(`/market/price/${ticker}`);
  },
};

// ── Analytics ──────────────────────────────────────────────────────────────────
export interface BackendLeaderboardEntry {
  user_id: string;
  full_name?: string;
  university?: string;
  team_name?: string;          // ← add if missing
  rank_position?: number;
  final_score?: number;
  portfolio_score?: number;
  portfolio_value?: number;    // ← add if missing
  week_number?: number;
}

export type BackendWeeklyScore = {
  week_number: number;
  portfolio_score: number;
  risk_score: number;
  thesis_score: number;
  execution_score: number;
  strategy_score: number;
  final_score: number;
  rank_position: number | null;
};

export const analytics = {
  getLeaderboard(week?: number): Promise<{ week: number | null; count: number; entries: BackendLeaderboardEntry[] }> {
    const qs = week != null ? `?week=${week}` : "";
    return apiFetch(`/analytics/leaderboard${qs}`);
  },

  getScores(userId: string): Promise<{ user_id: string; scores: BackendWeeklyScore[] }> {
    return apiFetch(`/analytics/scores/${userId}`);
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors in `api.ts`.

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/api.ts"
git commit -m "feat: add API client module with token helpers and endpoint namespaces"
```

---

## Task 2: Update auth-store.ts

**Files:**
- Modify: `frontend/DRA App/src/native/auth-store.ts`

Key changes:
- `saveRegisteredUser()` calls `auth.register()` instead of writing to localStorage directly
- `signInUser()` signature changes from `(studentId, password)` to `(email, password)` and calls `auth.login()`
- `clearActiveUser()` also calls `clearToken()`
- `backendUserToUserData()` maps backend `user_id` to frontend `studentId`

- [ ] **Step 1: Replace `auth-store.ts` completely**

Replace the full content of `frontend/DRA App/src/native/auth-store.ts` with:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, setToken, clearToken } from "./api";
import type { BackendUser } from "./api";
import type { UserData } from "./types";

const USERS_KEY = "dra.studentProfiles";
const SESSION_KEY = "dra.activeStudentId";
let memoryUsers: UserData[] = [];
let memoryActiveStudentId = "";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readUsers(): Promise<UserData[]> {
  if (!hasStorage()) {
    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      memoryUsers = stored ? (JSON.parse(stored) as UserData[]) : [];
      return memoryUsers;
    } catch {
      return memoryUsers;
    }
  }
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) || "[]") as UserData[];
  } catch {
    return memoryUsers;
  }
}

async function writeUsers(users: UserData[]) {
  memoryUsers = users;
  if (!hasStorage()) {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    return;
  }
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// DD/MM/YYYY → YYYY-MM-DD for the backend date_of_birth field
function parseDobToISO(dob: string): string | undefined {
  if (!dob) return undefined;
  const parts = dob.split("/");
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (!d || !m || !y) return undefined;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function backendUserToUserData(u: BackendUser): UserData {
  return {
    studentId: u.user_id,
    fullName: u.full_name,
    email: u.email,
    university: u.university ?? "",
    course: u.course ?? "",
    yearOfStudy: u.year_of_study != null ? String(u.year_of_study) : "",
    participationType: u.participation_type?.toLowerCase() === "team" ? "Team" : "Individual",
    teamName: u.team_name ?? "",
    age: "",
    dateOfBirth: "",
    phoneNumber: "",
    password: "",
  };
}

export async function generateStudentId() {
  const users = await readUsers();
  const year = "2026";
  const next =
    users.reduce((max, user) => {
      if (!user.studentId.startsWith(year) || user.studentId.length !== 12) return max;
      const sequence = Number(user.studentId.slice(4));
      return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
    }, 0) + 1;
  return `${year}${String(next).padStart(8, "0")}`;
}

export async function saveRegisteredUser(user: UserData): Promise<UserData> {
  const { user: backendUser, token } = await auth.register({
    full_name: user.fullName,
    email: user.email,
    password: user.password,
    age: user.age ? parseInt(user.age) : undefined,
    date_of_birth: parseDobToISO(user.dateOfBirth),
    phone_number: user.phoneNumber || undefined,
    university: user.university || undefined,
    course: user.course || undefined,
    year_of_study: user.yearOfStudy ? parseInt(user.yearOfStudy) : undefined,
    participation_type: user.participationType.toLowerCase(),
    team_name: user.teamName || undefined,
  });

  setToken(token);
  const cachedUser = backendUserToUserData(backendUser);
  const existing = await readUsers();
  const deduped = existing.filter((u) => u.studentId !== cachedUser.studentId && u.email !== cachedUser.email);
  await writeUsers([...deduped, cachedUser]);
  await setActiveStudentId(cachedUser.studentId);
  return cachedUser;
}

// Note: signature changed — now accepts email instead of studentId to match /auth/login
export async function signInUser(email: string, password: string): Promise<UserData | null> {
  try {
    const { user: backendUser, token } = await auth.login(email, password);
    setToken(token);
    const cachedUser = backendUserToUserData(backendUser);
    const existing = await readUsers();
    const deduped = existing.filter((u) => u.studentId !== cachedUser.studentId);
    await writeUsers([...deduped, cachedUser]);
    await setActiveStudentId(cachedUser.studentId);
    return cachedUser;
  } catch {
    return null;
  }
}

export async function setActiveStudentId(studentId: string) {
  memoryActiveStudentId = studentId;
  if (!hasStorage()) {
    await AsyncStorage.setItem(SESSION_KEY, studentId);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, studentId);
}

export async function getActiveUser(): Promise<UserData | null> {
  const activeId = hasStorage()
    ? window.localStorage.getItem(SESSION_KEY)
    : (await AsyncStorage.getItem(SESSION_KEY)) || memoryActiveStudentId;
  if (!activeId) return null;
  const users = await readUsers();
  return users.find((user) => user.studentId === activeId) || null;
}

export async function clearActiveUser() {
  clearToken();
  memoryActiveStudentId = "";
  if (!hasStorage()) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors in `auth-store.ts`.

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/auth-store.ts"
git commit -m "feat: wire auth-store register and login to Flask API"
```

---

## Task 3: Update sign-in page to use email

**Files:**
- Modify: `frontend/DRA App/src/native/pages/sign-in-page.tsx`

The `SignInPage` currently accepts `(studentId, password)`. Flask `/auth/login` requires email. Change the prop type, state name, field label, and placeholder.

- [ ] **Step 1: Change state variable from `studentId` to `email`**

In `frontend/DRA App/src/native/pages/sign-in-page.tsx`:

```typescript
// BEFORE
const [studentId, setStudentId] = useState("");

// AFTER
const [email, setEmail] = useState("");
```

- [ ] **Step 2: Change the prop type signature**

```typescript
// BEFORE
export function SignInPage({ onSubmit, onBack }: { onSubmit: (studentId: string, password: string) => Promise<UserData | null>; onBack: () => void })

// AFTER
export function SignInPage({ onSubmit, onBack }: { onSubmit: (email: string, password: string) => Promise<UserData | null>; onBack: () => void })
```

- [ ] **Step 3: Update the Field component**

```typescript
// BEFORE
<Field label="User ID / Student ID" value={studentId} onChangeText={(value) => {
  setError("");
  setStudentId(value.toUpperCase());
}} placeholder="202600000001" />

// AFTER
<Field label="Email" value={email} onChangeText={(value) => {
  setError("");
  setEmail(value);
}} placeholder="john@university.edu" keyboardType="email-address" />
```

- [ ] **Step 4: Update handleSubmit and disabled condition**

```typescript
// BEFORE
const handleSubmit = async () => {
  setSubmitting(true);
  const user = await onSubmit(studentId, password);
  if (!user) setError("No matching User ID and password found.");
  setSubmitting(false);
};
// ...
disabled={submitting || !studentId.trim() || !password.trim()}

// AFTER
const handleSubmit = async () => {
  setSubmitting(true);
  const user = await onSubmit(email, password);
  if (!user) setError("Invalid email or password.");
  setSubmitting(false);
};
// ...
disabled={submitting || !email.trim() || !password.trim()}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add "frontend/DRA App/src/native/pages/sign-in-page.tsx"
git commit -m "feat: sign-in page uses email field to match backend /auth/login"
```

---

## Task 4: Update challenge-app.tsx

**Files:**
- Modify: `frontend/DRA App/src/native/challenge-app.tsx`

`signInUser` now handles `setActiveStudentId` internally. Remove the redundant import and call. Rename the `studentId` parameter to `email` in the `onSubmit` handler.

- [ ] **Step 1: Update the import line**

In `frontend/DRA App/src/native/challenge-app.tsx`:

```typescript
// BEFORE
import { getActiveUser, saveRegisteredUser, setActiveStudentId, signInUser } from "./auth-store";

// AFTER
import { getActiveUser, saveRegisteredUser, signInUser } from "./auth-store";
```

- [ ] **Step 2: Update the SignInPage onSubmit handler**

```typescript
// BEFORE
onSubmit={async (studentId, password) => {
  const user = await signInUser(studentId, password);
  if (!user) return null;
  await setActiveStudentId(user.studentId);
  setUserData(user);
  setFlow("app");
  return user;
}}

// AFTER
onSubmit={async (email, password) => {
  const user = await signInUser(email, password);
  if (!user) return null;
  setUserData(user);
  setFlow("app");
  return user;
}}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add "frontend/DRA App/src/native/challenge-app.tsx"
git commit -m "feat: update challenge-app login flow to pass email to signInUser"
```

---

## Task 5: Wire dashboard to portfolio summary API

**Files:**
- Modify: `frontend/DRA App/src/native/pages/dashboard.tsx`

Replace hardcoded `"$10,620"`, `"+6.2% vs base"` and `sampleOverallSummary` with a `useEffect` that calls `portfolio.getSummary(studentId)`.

- [ ] **Step 1: Replace dashboard.tsx**

Replace the full content of `frontend/DRA App/src/native/pages/dashboard.tsx` with:

```tsx
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { C, font } from "../constants";
import { portfolio } from "../api";
import type { PortfolioSummary } from "../api";
import { Legend, LineChart } from "../components/charts";
import { GlassCard, Progress, SectionTitle } from "../components/ui";

function StatCard({ label, value, sub, color = C.cyan }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <GlassCard style={{ flex: 1, minWidth: 150, padding: 14 }} accent={color}>
      <SectionTitle title={label} accent={color} />
      <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 24, marginTop: 5 }}>
        {value}
      </Text>
      <Text selectable style={{ color, fontFamily: font.regular, fontSize: 11, marginTop: 4 }}>
        {sub}
      </Text>
    </GlassCard>
  );
}

export function Dashboard({ userName, studentId }: { userName: string; studentId: string }) {
  const [tab, setTab] = useState<"overview" | "scoring" | "market" | "tasks">("overview");
  const tabs = ["overview", "scoring", "market", "tasks"] as const;
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    portfolio
      .getSummary(studentId)
      .then(setSummary)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [studentId]);

  const portfolioValue = summary
    ? `$${summary.total_portfolio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
  const returnPct = summary
    ? `${summary.total_return_pct >= 0 ? "+" : ""}${summary.total_return_pct.toFixed(1)}%`
    : "—";
  const pnlLabel = summary ? `${summary.total_pnl >= 0 ? "+" : ""}$${summary.total_pnl.toFixed(2)} P&L` : "Loading...";
  const cashLabel = summary ? `$${summary.cash_balance.toFixed(2)} cash` : "—";

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 25 }}>
          Welcome, {userName.split(" ")[0] || "Analyst"}
        </Text>
        <Text selectable style={{ color: C.text2, fontFamily: font.regular, fontSize: 13, marginTop: 4 }}>
          {loading
            ? "Loading portfolio..."
            : `Portfolio ${returnPct} vs $${summary?.total_capital.toFixed(0)} base.`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.cyan} />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatCard label="Portfolio Value" value={portfolioValue} sub={pnlLabel} color={C.green} />
          <StatCard label="Return" value={returnPct} sub={`vs $${summary?.total_capital.toFixed(0)} base`} color={C.cyan} />
          <StatCard label="Holdings" value={String(summary?.holdings_count ?? 0)} sub="positions" color={C.purple} />
          <StatCard label="Cash" value={cashLabel} sub="available" color={C.gold} />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {tabs.map((item) => {
          const active = tab === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setTab(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active ? "rgba(49,230,255,0.14)" : "rgba(255,255,255,0.05)",
                borderColor: active ? C.cyan : C.border,
                borderWidth: 1,
              }}
            >
              <Text selectable style={{ color: active ? C.cyan : C.text2, fontFamily: font.medium, fontSize: 12, textTransform: "capitalize" }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tab === "overview" ? (
        <>
          <GlassCard style={{ padding: 16 }} accent={C.cyan}>
            <SectionTitle title="Portfolio Overview" accent={C.cyan} />
            <LineChart />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
              <Legend color={C.cyan} label="Portfolio" />
              <Legend color={C.text2} label="Benchmark" />
            </View>
          </GlassCard>
          {summary && (
            <GlassCard style={{ padding: 16, gap: 12 }} accent={C.purple}>
              <SectionTitle title="Allocation" accent={C.purple} />
              <Progress label="Holdings" value={Math.round((summary.holdings_value / summary.total_capital) * 100)} color={C.green} />
              <Progress label="Cash" value={Math.round((summary.cash_balance / summary.total_capital) * 100)} color={C.cyan} />
            </GlassCard>
          )}
        </>
      ) : null}

      {tab === "market" ? (
        <GlassCard style={{ padding: 16, gap: 8 }} accent={C.cyan}>
          {(
            [
              ["NIFTY 50", "24,386", "+0.84%", true],
              ["SENSEX", "80,125", "+0.71%", true],
              ["NIFTY IT", "38,940", "+1.29%", true],
              ["NIFTY PHARMA", "19,420", "-0.22%", false],
            ] as const
          ).map(([name, price, change, up]) => (
            <View
              key={name}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomColor: C.border, borderBottomWidth: 1 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {up ? <TrendingUp size={15} color={C.green} /> : <TrendingDown size={15} color={C.red} />}
                <Text selectable style={{ color: C.text1, fontFamily: font.medium, fontSize: 13 }}>{name}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 13 }}>{price}</Text>
                <Text selectable style={{ color: up ? C.green : C.red, fontFamily: font.mono, fontSize: 11 }}>{change}</Text>
              </View>
            </View>
          ))}
        </GlassCard>
      ) : null}

      {tab === "tasks" ? (
        <GlassCard style={{ padding: 16, gap: 12 }} accent={C.gold}>
          <SectionTitle title="This Week's Tasks" accent={C.gold} />
          {(
            [
              ["Register and complete onboarding", true, "Done"],
              ["Submit initial portfolio", true, "Done"],
              ["Write investment thesis", true, "Done"],
              ["Submit Week 3 rebalancing note", false, "Due Jun 8"],
              ["Attend live strategy session", false, "Jun 10, 6PM"],
            ] as const
          ).map(([label, done, due]) => (
            <View key={label} style={{ flexDirection: "row", gap: 10, alignItems: "center", borderBottomColor: C.border, borderBottomWidth: 1, paddingBottom: 9 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: done ? C.green : C.border2, backgroundColor: done ? "rgba(30,230,163,0.16)" : "transparent" }} />
              <Text selectable style={{ color: done ? C.text2 : C.text1, flex: 1, fontSize: 13 }}>{label}</Text>
              <Text selectable style={{ color: done ? C.green : C.text2, fontSize: 11 }}>{due}</Text>
            </View>
          ))}
        </GlassCard>
      ) : null}

      {tab === "scoring" ? (
        <GlassCard style={{ padding: 16, gap: 12 }} accent={C.purple}>
          <SectionTitle title="Scoring" accent={C.purple} />
          <Text selectable style={{ color: C.text2, fontSize: 12 }}>
            Scores are computed weekly. Check the Scores tab for your detailed breakdown.
          </Text>
        </GlassCard>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/pages/dashboard.tsx"
git commit -m "feat: dashboard loads real portfolio summary from backend API"
```

---

## Task 6: Wire portfolio Submit to backend

**Files:**
- Modify: `frontend/DRA App/src/native/pages/portfolio-builder.tsx`

Add a `submitToBackend()` function and change the Submit button to call it. "Save Draft" continues to use `savePortfolioDraft` (local storage). The quantity for each trade is calculated from `amountInvested ÷ buyPrice`.

- [ ] **Step 1: Add import for `portfolio` from api.ts**

At the top of `frontend/DRA App/src/native/pages/portfolio-builder.tsx`, add this line after the existing imports:

```typescript
import { portfolio } from "../api";
```

- [ ] **Step 2: Add `submitToBackend` function inside `PortfolioBuilder`**

Add this async function inside the `PortfolioBuilder` component body, directly after the `saveDraft` function:

```typescript
async function submitToBackend() {
  if (!userData?.studentId) {
    setDraftStatus("Not logged in.");
    return;
  }
  setDraftStatus("Submitting trades to server...");
  try {
    for (const position of positions) {
      const rawPrice = parseFloat(position.buyPrice.replace(/[^0-9.]/g, ""));
      const rawAmount = parseFloat(position.amountInvested.replace(/[^0-9.]/g, ""));
      const quantity =
        rawPrice > 0 && rawAmount > 0 ? Math.max(1, Math.round(rawAmount / rawPrice)) : 1;

      await portfolio.executeTrade({
        stock_ticker: position.stockTicker,
        trade_type: position.tradeType === "Buy" ? "BUY" : "SELL",
        quantity,
        tag1: position.tag1 === "(optional)" ? undefined : position.tag1 || undefined,
        tag2: position.tag2 === "(optional)" ? undefined : position.tag2 || undefined,
        tag3: position.tag3 === "(optional)" ? undefined : position.tag3 || undefined,
        thesis: position.thesis || undefined,
      });
    }
    setDraftStatus(`${positions.length} trade(s) submitted successfully.`);
  } catch (err) {
    setDraftStatus(`Error: ${err instanceof Error ? err.message : "Submission failed"}`);
  }
}
```

- [ ] **Step 3: Update the Submit button's `onPress`**

Find the Submit `AppButton` and change its `onPress`:

```typescript
// BEFORE
<AppButton label="Submit" onPress={() => {
  void saveDraft("Portfolio setup and trade log saved.");
  setSubmitted(true);
}} disabled={overLimit} />

// AFTER
<AppButton label="Submit" onPress={() => {
  void submitToBackend();
  setSubmitted(true);
}} disabled={overLimit} />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "frontend/DRA App/src/native/pages/portfolio-builder.tsx"
git commit -m "feat: portfolio Submit button calls backend executeTrade API"
```

---

## Task 7: Wire leaderboard to API

**Files:**
- Modify: `frontend/DRA App/src/native/pages/leaderboard.tsx`

Replace the hardcoded rows with a `useEffect` that fetches `analytics.getLeaderboard()`.

- [ ] **Step 1: Replace leaderboard.tsx**

Replace the full content of `frontend/DRA App/src/native/pages/leaderboard.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { C, font } from "../constants";
import { analytics } from "../api";
import type { BackendLeaderboardEntry } from "../api";
import { GlassCard, SectionTitle } from "../components/ui";

function StatCard({ label, value, sub, color = C.cyan }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <GlassCard style={{ flex: 1, minWidth: 150, padding: 14 }} accent={color}>
      <SectionTitle title={label} accent={color} />
      <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 24, marginTop: 5 }}>
        {value}
      </Text>
      <Text selectable style={{ color, fontFamily: font.regular, fontSize: 11, marginTop: 4 }}>
        {sub}
      </Text>
    </GlassCard>
  );
}

const rankColors = [C.gold, "#cfd6e6", "#cd7f32"];

export function Leaderboard() {
  const [entries, setEntries] = useState<BackendLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analytics
      .getLeaderboard()
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 25 }}>
          Leaderboard
        </Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Weekly ranking blends performance and strategy.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatCard label="1st Prize" value="$1,000" sub="top score" color={C.gold} />
        <StatCard label="Total" value={loading ? "…" : String(entries.length)} sub="participants" color={C.cyan} />
      </View>

      <GlassCard style={{ padding: 12, gap: 8 }} accent={C.gold}>
        <SectionTitle title="Rankings" accent={C.gold} />
        {loading ? (
          <ActivityIndicator color={C.cyan} />
        ) : entries.length === 0 ? (
          <Text selectable style={{ color: C.text2, fontSize: 13 }}>
            No entries yet. Rankings appear after the first scoring run.
          </Text>
        ) : (
          entries.map((entry, index) => (
            <View
              key={entry.user_id}
              style={{ padding: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text selectable style={{ width: 30, color: rankColors[index] ?? C.text1, fontFamily: font.mono, fontSize: 16 }}>
                #{entry.rank_position ?? index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 14 }}>
                  {entry.full_name ?? entry.user_id}
                </Text>
                <Text selectable style={{ color: C.text2, fontSize: 11 }}>
                  {entry.university ?? "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 15 }}>
                  {entry.final_score.toFixed(1)}
                </Text>
                <Text selectable style={{ color: C.green, fontFamily: font.mono, fontSize: 11 }}>
                  +{entry.portfolio_score.toFixed(1)} pts
                </Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/pages/leaderboard.tsx"
git commit -m "feat: leaderboard fetches rankings from backend API"
```

---

## Task 8: Wire scores page to API

**Files:**
- Modify: `frontend/DRA App/src/native/pages/scores.tsx`

Replace `sampleWeeklyScores` / `sampleOverallSummary` with a `useEffect` that fetches `analytics.getScores(studentId)`. Score components are scaled to 0–100 for the Progress bars (portfolio/50, risk/20, execution/10, strategy/15, thesis/5).

- [ ] **Step 1: Replace scores.tsx**

Replace the full content of `frontend/DRA App/src/native/pages/scores.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { C, font } from "../constants";
import { analytics } from "../api";
import type { BackendWeeklyScore } from "../api";
import { GlassCard, Progress, SectionTitle } from "../components/ui";

function Row({ label, value, color = C.text1 }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: C.border, borderBottomWidth: 1 }}>
      <Text selectable style={{ color: C.text2, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text selectable style={{ color, fontFamily: font.mono, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

export function Scores({ studentId }: { studentId: string }) {
  const [scores, setScores] = useState<BackendWeeklyScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    analytics
      .getScores(studentId)
      .then((res) => setScores(res.scores))
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  const cumulativeScore = scores.reduce((sum, s) => sum + s.final_score, 0);
  const latestRank = scores.length > 0 ? scores[0].rank_position : null;

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 25 }}>Scores</Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Weekly score breakdown — updated after each scoring run.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.cyan} />
      ) : scores.length === 0 ? (
        <GlassCard style={{ padding: 16 }} accent={C.cyan}>
          <Text selectable style={{ color: C.text2, fontSize: 13 }}>
            No scores yet. Scores are computed weekly after the deadline.
          </Text>
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ padding: 16, gap: 12 }} accent={C.green}>
            <SectionTitle title="Weekly Scores" accent={C.green} />
            {scores.map((week) => (
              <View key={week.week_number} style={{ padding: 12, borderRadius: 12, backgroundColor: C.bg2, borderColor: C.border, borderWidth: 1, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 14 }}>
                    Week {week.week_number}
                  </Text>
                  <Text selectable style={{ color: week.final_score > 0 ? C.green : C.text2, fontFamily: font.mono, fontSize: 15 }}>
                    {week.final_score.toFixed(1)}/100
                  </Text>
                </View>
                <Progress label="Portfolio Score (50)" value={Math.round((week.portfolio_score / 50) * 100)} color={C.green} />
                <Progress label="Risk Score (20)" value={Math.round((week.risk_score / 20) * 100)} color={C.cyan} />
                <Progress label="Execution Score (10)" value={Math.round((week.execution_score / 10) * 100)} color={C.gold} />
                <Progress label="Strategy Score (15)" value={Math.round((week.strategy_score / 15) * 100)} color={C.purple} />
                <Progress label="Thesis Score (5)" value={Math.round((week.thesis_score / 5) * 100)} color={C.text1} />
                <Row label="Weekly Rank" value={week.rank_position ? `#${week.rank_position}` : "Pending"} color={week.rank_position ? C.cyan : C.text2} />
              </View>
            ))}
          </GlassCard>

          <GlassCard style={{ padding: 16, gap: 10 }} accent={C.purple}>
            <SectionTitle title="Summary" accent={C.purple} />
            <Row label="User ID" value={studentId} color={C.cyan} />
            <Row label="Weeks Scored" value={String(scores.length)} />
            <Row label="Cumulative Score" value={`${cumulativeScore.toFixed(1)} pts`} color={C.green} />
            {latestRank != null && <Row label="Latest Rank" value={`#${latestRank}`} color={C.cyan} />}
          </GlassCard>
        </>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "frontend/DRA App" && npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/src/native/pages/scores.tsx"
git commit -m "feat: scores page fetches weekly data from backend API"
```

---

## Task 9: Backend Dockerfile and entrypoint

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/entrypoint.sh`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/.dockerignore`**

Create `backend/.dockerignore`:

```
venv/
__pycache__/
*.pyc
*.pyo
.env
```

- [ ] **Step 2: Create `backend/entrypoint.sh`**

Create `backend/entrypoint.sh`:

```sh
#!/bin/sh
set -e

echo "Waiting for MySQL at ${DB_HOST:-localhost}:${DB_PORT:-3306}..."
python - <<'PYEOF'
import socket, time, os, sys
host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", "3306"))
for attempt in range(30):
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        print(f"MySQL is ready at {host}:{port}")
        sys.exit(0)
    except OSError:
        print(f"Attempt {attempt + 1}/30: MySQL not ready, retrying in 2s...")
        time.sleep(2)
print("ERROR: MySQL did not start within 60s.", file=sys.stderr)
sys.exit(1)
PYEOF

exec flask run --host=0.0.0.0 --port=5000
```

- [ ] **Step 3: Create `backend/Dockerfile`**

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/entrypoint.sh backend/.dockerignore
git commit -m "feat: add backend Dockerfile with MySQL-wait entrypoint"
```

---

## Task 10: Frontend Dockerfile

**Files:**
- Create: `frontend/DRA App/Dockerfile`
- Create: `frontend/DRA App/.dockerignore`

- [ ] **Step 1: Create `frontend/DRA App/.dockerignore`**

Create `frontend/DRA App/.dockerignore`:

```
node_modules/
.expo/
*.log
```

- [ ] **Step 2: Create `frontend/DRA App/Dockerfile`**

Create `frontend/DRA App/Dockerfile`:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 8081
ENV EXPO_PUBLIC_API_URL=http://localhost:5000
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--non-interactive"]
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/DRA App/Dockerfile" "frontend/DRA App/.dockerignore"
git commit -m "feat: add frontend Dockerfile for Expo web"
```

---

## Task 11: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

Add `backend` and `frontend` services. The backend `env_file` loads `./backend/.env`; the `environment` block overrides `DB_HOST` to the container name `mysql` and sets `FLASK_APP`.

- [ ] **Step 1: Replace docker-compose.yml**

Replace the full content of `docker-compose.yml` with:

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: tradeiq-mysql
    restart: unless-stopped
    environment:
      MYSQL_ALLOW_EMPTY_PASSWORD: "yes"
      MYSQL_DATABASE: tradeiq
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/migrations/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  backend:
    build: ./backend
    container_name: tradeiq-backend
    restart: unless-stopped
    env_file: ./backend/.env
    environment:
      DB_HOST: mysql
      FLASK_APP: run.py
    ports:
      - "5000:5000"
    depends_on:
      - mysql

  frontend:
    build:
      context: "./frontend/DRA App"
      dockerfile: Dockerfile
    container_name: tradeiq-frontend
    restart: unless-stopped
    environment:
      EXPO_PUBLIC_API_URL: "http://localhost:5000"
    ports:
      - "8081:8081"
    depends_on:
      - backend

volumes:
  mysql_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add backend and frontend services to docker-compose"
```

---

## Task 12: Smoke test

- [ ] **Step 1: Build and start all three services**

From the project root (`/home/siva/akion/SalesTrading`):

```bash
docker-compose up --build
```

Expected (in order):
- `tradeiq-mysql` initialises with the schema from `migrations/schema.sql`
- `tradeiq-backend` prints "MySQL is ready" then "Running on http://0.0.0.0:5000"
- `tradeiq-frontend` prints "Expo DevTools is running" and "Web is waiting on http://localhost:8081"

- [ ] **Step 2: Verify backend health**

```bash
curl http://localhost:5000/health
```

Expected:
```json
{"app": "TradeIQ Academy", "status": "ok"}
```

- [ ] **Step 3: Register a test user**

```bash
curl -s -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","email":"test@uni.edu","password":"password123"}' \
  | python3 -m json.tool
```

Expected: JSON containing `"message": "Registration successful"`, `"user": {"user_id": "TIQ-XXXX", ...}`, and `"token": "eyJ..."`.

- [ ] **Step 4: Open the web app and register via UI**

1. Open `http://localhost:8081` in a browser
2. Navigate to the registration form (click through landing page)
3. Fill in name, email, password, university, and other required fields
4. Click "Continue to Onboarding" — the frontend calls `POST /auth/register`; on success the user lands in the onboarding flow
5. Complete onboarding and payment screens
6. Dashboard should load and display real portfolio data (not hardcoded `"$10,620"`)

- [ ] **Step 5: Test sign-in via UI**

1. Log out via the profile modal
2. Navigate to Sign In
3. Enter the email and password used during registration
4. Dashboard loads with the correct user's data

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: smoke test passed — all three services running in Docker"
```
