import { Award, TrendingDown, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { C, font } from "../constants";
import { analytics, market, portfolio } from "../api";
import type { BackendWeeklyScore, MarketIndex, PortfolioSummary } from "../api";
import { Legend, LineChart } from "../components/charts";
import { GlassCard, Progress, SectionTitle } from "../components/ui";
import { getMarketIndices } from "../market-store";

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

function ScoreMetricCard({ label, value, max, color = C.cyan }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={{ flex: 1, minWidth: 150, padding: 14, borderRadius: 8, backgroundColor: "rgba(5,8,18,0.72)", borderColor: C.border, borderWidth: 1, gap: 12 }}>
      <Text selectable style={{ color: C.text2, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase", textAlign: "center" }}>
        {label}
      </Text>
      <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 23, textAlign: "center" }}>
        {value.toFixed(0)}<Text style={{ color: C.text2, fontSize: 13 }}>/{max}</Text>
      </Text>
      <View style={{ height: 4, borderRadius: 4, backgroundColor: C.bg3, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}

export function Dashboard({ userName, studentId }: { userName: string; studentId: string }) {
  const [tab, setTab] = useState<"overview" | "scoring" | "market" | "tasks">("overview");
  const tabs = ["overview", "scoring", "market", "tasks"] as const;
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [chartPerf, setChartPerf] = useState<number[]>([]);
  const [chartBench, setChartBench] = useState<number[]>([]);
  const [latestScore, setLatestScore] = useState<BackendWeeklyScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    portfolio
      .getSummary(studentId)
      .then(setSummary)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [studentId]);

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

  useEffect(() => {
    if (!studentId) return;
    setScoreLoading(true);
    analytics
      .computeScores(studentId)
      .catch(() => null)
      .then(() => analytics.getScores(studentId))
      .then((data) => {
        if (data.scores.length === 0) {
          setLatestScore(null);
          return;
        }
        setLatestScore(data.scores.reduce((max, score) => (score.week_number > max.week_number ? score : max)));
      })
      .catch(() => setLatestScore(null))
      .finally(() => setScoreLoading(false));
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
        <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 29, textTransform: "uppercase" }}>
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
          <StatCard label="Available Cash" value={cashLabel} sub="ready to deploy" color={C.gold} />
          <StatCard label="Portfolio Return" value={returnPct} sub={`vs $${summary?.total_capital.toFixed(0)} base`} color={C.cyan} />
          <StatCard label="Weekly Performance" value={scoreLoading ? "..." : `${Math.round(latestScore?.final_score ?? 0)}/100`} sub="scorecard" color={C.purple} />
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
            <LineChart perfData={chartPerf} benchmarkData={chartBench} />
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
          {(() => {
            const indian = marketIndices.filter((idx) => INDIAN_TICKERS.includes(idx.ticker));
            if (indian.length === 0) {
              return <Text style={{ color: C.text2, fontSize: 12 }}>Loading indices…</Text>;
            }
            return indian.map((idx) => (
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
            ));
          })()}
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
        <GlassCard style={{ padding: 16, gap: 18, backgroundColor: "rgba(10,16,32,0.96)" }} accent={C.cyan}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Award size={22} color={C.cyan} />
                <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 18 }}>
                  Weekly Risk Performance Scorecard
                </Text>
              </View>
              <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 5 }}>
                Calculated based on desk discipline and regulatory-style risk guides.
              </Text>
            </View>
            <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(49,230,255,0.38)", backgroundColor: "rgba(49,230,255,0.08)", alignItems: "center" }}>
              <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 9, textTransform: "uppercase" }}>
                Total Score
              </Text>
              <Text selectable style={{ color: C.cyan, fontFamily: font.mono, fontSize: 30 }}>
                {scoreLoading ? "..." : Math.round(latestScore?.final_score ?? 0)}<Text style={{ color: C.text2, fontSize: 13 }}>/100</Text>
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            <ScoreMetricCard label="Portfolio Perf" value={latestScore?.portfolio_score ?? 0} max={40} color={C.green} />
            <ScoreMetricCard label="Risk Gov" value={latestScore?.risk_score ?? 0} max={20} color={C.cyan} />
            <ScoreMetricCard label="Thesis Qual" value={latestScore?.thesis_score ?? 0} max={20} color={C.purple} />
            <ScoreMetricCard label="Execution" value={latestScore?.execution_score ?? 0} max={10} color={C.gold} />
            <ScoreMetricCard label="Strategy" value={latestScore?.strategy_score ?? 0} max={10} color={C.red} />
          </View>
        </GlassCard>
      ) : null}
    </View>
  );
}
