const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://trade-iq-deploy.onrender.com";

// ── Token storage ──────────────────────────────────────────────────────────────
const TOKEN_KEY = "dra.jwtToken";

// In-memory fallback for React Native (no window.localStorage)
let _memToken: string | null = null;

export function getToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return _memToken;
}

export function setToken(token: string): void {
  _memToken = token;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  _memToken = null;
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

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let errorMsg = `HTTP ${res.status}`;
    if (contentType?.includes("application/json")) {
      try {
        const errData = await res.json();
        errorMsg = (errData as { error?: string }).error ?? errorMsg;
      } catch {
        // JSON parse failed — use default HTTP status message
      }
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
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
    stock_name?: string;
    sector?: string;
    trade_type: "BUY" | "SELL";
    quantity: number;
    buy_price?: number;
    current_sell_price?: number;
    tag1?: string;
    tag2?: string;
    tag3?: string;
    thesis?: string;
    amount_invested?: number;
  }): Promise<{ message: string; trade: BackendTrade; cash_balance: number }> {
    return apiFetch("/portfolio/trade", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ── Market ─────────────────────────────────────────────────────────────────────
export type MarketPrice = { ticker: string; price: number };

export type StockSearchResult = {
  ticker: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  type: string | null;
};

export type MarketIndex = {
  name: string;
  ticker: string;
  price: string;
  change: string;
  up: boolean;
};

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

// ── Analytics ──────────────────────────────────────────────────────────────────
export type BackendLeaderboardEntry = {
  user_id: string;
  full_name: string | null;
  university: string | null;
  team_name?: string | null;
  week_number: number | null;
  portfolio_score: number;
  risk_score: number;
  thesis_score: number;
  execution_score: number;
  strategy_score: number;
  final_score: number;
  rank_position: number | null;
  portfolio_value?: number;
};

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

export type BackendScoreCard = {
  portfolio_score: number;
  risk_score: number;
  thesis_score: number;
  execution_score: number;
  strategy_score: number;
  final_score: number;
  feedback?: string;
  source?: string;
};

export type BackendScoreMetrics = {
  portfolio_value: number;
  desk_return_expansion: number;
  available_cash_depot: number;
  holdings_value: number;
  net_profit: number;
};

export type BackendScoreBreakdown = {
  key: string;
  label: string;
  score: number | null;
  max: number;
  status: string;
  detail: string;
};

export type BackendScoreInputs = {
  portfolio_return_pct: number;
  return_on_capital_pct: number;
  benchmark_growth_pct: number;
  net_profit: number;
  total_capital: number;
  cash_balance: number;
  holdings_value: number;
  active_holdings: number;
  unique_sectors: number;
  max_allocation: number;
  total_trades: number;
  trades_with_thesis: number;
};

export const analytics = {
  getLeaderboard(week?: number): Promise<{ week: number | null; count: number; entries: BackendLeaderboardEntry[] }> {
    const qs = week != null ? `?week=${week}` : "";
    return apiFetch(`/analytics/leaderboard${qs}`);
  },

  getScores(userId: string): Promise<{
    user_id: string;
    scores: BackendWeeklyScore[];
    latest_metrics: BackendScoreMetrics | null;
    current_score: BackendScoreCard | null;
    score_inputs: BackendScoreInputs | null;
    score_breakdown: BackendScoreBreakdown[];
  }> {
    return apiFetch(`/analytics/scores/${userId}`);
  },

  computeScores(userId: string): Promise<{ user_id: string; week_number: number; metrics: BackendScoreMetrics; weekly_score: BackendWeeklyScore | null }> {
    return apiFetch(`/analytics/compute/${userId}`, { method: "POST" });
  },
};
