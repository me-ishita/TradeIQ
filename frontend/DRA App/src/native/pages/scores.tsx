import { useEffect, useMemo, useState } from "react";
import { Award, Banknote, Brain, Gauge, PieChart, ShieldCheck, Sparkles, Target } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { C, font } from "../constants";
import { analytics } from "../api";
import type { BackendScoreBreakdown, BackendScoreCard, BackendScoreInputs, BackendScoreMetrics, BackendWeeklyScore } from "../api";
import { GlassCard, Progress, SectionTitle } from "../components/ui";

const scoreMeta: Record<string, { short: string; color: string; Icon: typeof PieChart }> = {
  portfolio_score: { short: "Portfolio", color: C.green, Icon: PieChart },
  risk_score: { short: "Risk", color: C.cyan, Icon: ShieldCheck },
  thesis_score: { short: "Thesis", color: C.purple, Icon: Brain },
  execution_score: { short: "Execution", color: C.gold, Icon: Gauge },
  strategy_score: { short: "Strategy", color: C.red, Icon: Target },
  clean_slate: { short: "Baseline", color: C.text2, Icon: Sparkles },
};

function currency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function Row({ label, value, color = C.text1 }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: C.border, borderBottomWidth: 1 }}>
      <Text selectable style={{ color: C.text2, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text selectable style={{ color, fontFamily: font.mono, fontSize: 12, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 158, padding: 14, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.045)", borderColor: `${color}44`, borderWidth: 1 }}>
      <Text selectable style={{ color: C.text2, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text selectable style={{ color, fontFamily: font.mono, fontSize: 20, marginTop: 7 }}>
        {value}
      </Text>
    </View>
  );
}

function ScoreMetricCard({ label, value, max, color, icon: Icon }: { label: string; value: number; max: number; color: string; icon: typeof PieChart }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={{ flex: 1, minWidth: 150, padding: 14, borderRadius: 8, backgroundColor: "rgba(5,8,18,0.72)", borderColor: `${color}55`, borderWidth: 1, gap: 11 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text selectable style={{ color: C.text1, fontFamily: font.medium, fontSize: 11, textTransform: "uppercase", flex: 1 }}>
          {label}
        </Text>
        <Icon size={17} color={color} />
      </View>
      <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 25 }}>
        {value.toFixed(0)}<Text style={{ color: C.text2, fontSize: 13 }}>/{max}</Text>
      </Text>
      <View style={{ height: 5, borderRadius: 5, backgroundColor: C.bg3, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}

function BreakdownCard({ item }: { item: BackendScoreBreakdown }) {
  const meta = scoreMeta[item.key] ?? { short: item.label, color: C.cyan, Icon: Award };
  const pct = item.score == null ? 0 : Math.max(0, Math.min(100, Math.round((item.score / item.max) * 100)));
  const Icon = meta.Icon;

  return (
    <View style={{ flex: 1, minWidth: 240, padding: 14, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", borderColor: `${meta.color}44`, borderWidth: 1, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: `${meta.color}18`, borderColor: `${meta.color}44`, borderWidth: 1 }}>
          <Icon size={17} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 13 }}>
            {item.label}
          </Text>
          <Text selectable style={{ color: meta.color, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase", marginTop: 2 }}>
            {item.status}
          </Text>
        </View>
        <Text selectable style={{ color: item.score == null ? C.text2 : meta.color, fontFamily: font.mono, fontSize: 15 }}>
          {item.score == null ? "--" : item.score.toFixed(1)}<Text style={{ color: C.text2, fontSize: 11 }}>/{item.max}</Text>
        </Text>
      </View>
      {item.score != null ? (
        <View style={{ height: 5, borderRadius: 5, backgroundColor: C.bg3, overflow: "hidden" }}>
          <View style={{ width: `${pct}%`, height: "100%", backgroundColor: meta.color }} />
        </View>
      ) : null}
      <Text selectable style={{ color: C.text2, fontSize: 12, lineHeight: 18 }}>
        {item.detail}
      </Text>
    </View>
  );
}

export function Scores({ studentId }: { studentId: string }) {
  const [scores, setScores] = useState<BackendWeeklyScore[]>([]);
  const [currentScore, setCurrentScore] = useState<BackendScoreCard | null>(null);
  const [metrics, setMetrics] = useState<BackendScoreMetrics | null>(null);
  const [inputs, setInputs] = useState<BackendScoreInputs | null>(null);
  const [breakdown, setBreakdown] = useState<BackendScoreBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);
    setError(false);

    analytics
      .getScores(studentId)
      .then((res) => {
        setScores(res.scores);
        setCurrentScore(res.current_score);
        setMetrics(res.latest_metrics);
        setInputs(res.score_inputs);
        setBreakdown(res.score_breakdown ?? []);
      })
      .catch(() => {
        setError(true);
        setScores([]);
        setCurrentScore(null);
        setMetrics(null);
        setInputs(null);
        setBreakdown([]);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const latestWeekScore = scores.length > 0 ? scores.reduce((a, b) => (a.week_number > b.week_number ? a : b)) : null;
  const displayScore = currentScore ?? latestWeekScore;
  const cumulativeScore = scores.reduce((sum, s) => sum + s.final_score, 0);
  const latestRank = latestWeekScore?.rank_position ?? null;
  const cleanSlate = (inputs?.active_holdings ?? 0) === 0;

  const metricCards = useMemo(
    () => [
      { key: "portfolio_score", label: "Portfolio", value: displayScore?.portfolio_score ?? 0, max: 40 },
      { key: "risk_score", label: "Risk", value: displayScore?.risk_score ?? 0, max: 20 },
      { key: "thesis_score", label: "Thesis", value: displayScore?.thesis_score ?? 0, max: 20 },
      { key: "execution_score", label: "Execution", value: displayScore?.execution_score ?? 0, max: 10 },
      { key: "strategy_score", label: "Strategy", value: displayScore?.strategy_score ?? 0, max: 10 },
    ],
    [displayScore],
  );

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 29, textTransform: "uppercase" }}>Scores</Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Live scoring rubric with a full component breakdown.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.cyan} />
      ) : error ? (
        <GlassCard style={{ padding: 16 }} accent={C.red}>
          <Text selectable style={{ color: C.red, fontSize: 13 }}>Failed to load scores. Please try again.</Text>
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ padding: 16, gap: 16, backgroundColor: "rgba(7,12,27,0.96)", borderColor: "rgba(49,230,255,0.26)" }} accent={C.cyan}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 230 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <Award size={23} color={C.cyan} />
                  <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 18 }}>
                    TradeIQ Scorecard
                  </Text>
                </View>
                <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
                  {cleanSlate
                    ? "Clean slate active: scores stay at 0 until a portfolio has active holdings."
                    : "Calculated from active holdings, cash balance, sector diversification, thesis coverage, and execution quality."}
                </Text>
              </View>
              <View style={{ minWidth: 150, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 8, borderWidth: 1, borderColor: "rgba(49,230,255,0.40)", backgroundColor: "rgba(49,230,255,0.08)", alignItems: "center" }}>
                <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 9, textTransform: "uppercase" }}>
                  Live Total
                </Text>
                <Text selectable style={{ color: C.cyan, fontFamily: font.mono, fontSize: 34 }}>
                  {Math.round(displayScore?.final_score ?? 0)}<Text style={{ color: C.text2, fontSize: 13 }}>/100</Text>
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <StatPill label="Portfolio Value" value={currency(metrics?.portfolio_value ?? 10000)} color={C.green} />
              <StatPill label="Cash Balance" value={currency(metrics?.available_cash_depot ?? 10000)} color={C.gold} />
              <StatPill label="Active Holdings" value={String(inputs?.active_holdings ?? 0)} color={C.purple} />
              <StatPill label="Return on Capital" value={`${(inputs?.return_on_capital_pct ?? 0).toFixed(2)}%`} color={(inputs?.return_on_capital_pct ?? 0) >= 0 ? C.cyan : C.red} />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {metricCards.map((card) => {
                const meta = scoreMeta[card.key];
                return <ScoreMetricCard key={card.key} label={card.label} value={card.value} max={card.max} color={meta.color} icon={meta.Icon} />;
              })}
            </View>
          </GlassCard>

          <GlassCard style={{ padding: 16, gap: 12 }} accent={C.purple}>
            <SectionTitle title="Score Breakdown" accent={C.purple} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {breakdown.map((item) => (
                <BreakdownCard key={item.key} item={item} />
              ))}
            </View>
          </GlassCard>

          <GlassCard style={{ padding: 16, gap: 8 }} accent={C.cyan}>
            <SectionTitle title="Rubric Rules" accent={C.cyan} />
            <Row label="Clean / Zero Slate" value="0/100 until active holdings exist" color={cleanSlate ? C.gold : C.green} />
            <Row label="Portfolio Score" value="Return on capital, max 40" color={C.green} />
            <Row label="Risk Management" value="Sector diversity, max 20" color={C.cyan} />
            <Row label="Thesis Score" value="AI score or 15 baseline, max 20" color={C.purple} />
            <Row label="Execution Quality" value="Baseline 8, max 10" color={C.gold} />
            <Row label="Strategy Score" value="Active position expansion, max 10" color={C.red} />
          </GlassCard>

          {scores.length > 0 ? (
            <GlassCard style={{ padding: 16, gap: 12 }} accent={C.green}>
              <SectionTitle title="Weekly History" accent={C.green} />
              {scores.map((week) => (
                <View key={week.week_number} style={{ padding: 12, borderRadius: 8, backgroundColor: C.bg2, borderColor: C.border, borderWidth: 1, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 14 }}>
                      Week {week.week_number}
                    </Text>
                    <Text selectable style={{ color: week.final_score > 0 ? C.green : C.text2, fontFamily: font.mono, fontSize: 15 }}>
                      {week.final_score.toFixed(1)}/100
                    </Text>
                  </View>
                  <Progress label="Portfolio (40)" value={Math.round((week.portfolio_score / 40) * 100)} color={C.green} />
                  <Progress label="Risk (20)" value={Math.round((week.risk_score / 20) * 100)} color={C.cyan} />
                  <Progress label="Thesis (20)" value={Math.round((week.thesis_score / 20) * 100)} color={C.purple} />
                  <Progress label="Execution (10)" value={Math.round((week.execution_score / 10) * 100)} color={C.gold} />
                  <Progress label="Strategy (10)" value={Math.round((week.strategy_score / 10) * 100)} color={C.red} />
                  <Row label="Weekly Rank" value={week.rank_position ? `#${week.rank_position}` : "Pending"} color={week.rank_position ? C.cyan : C.text2} />
                </View>
              ))}
            </GlassCard>
          ) : null}

          <GlassCard style={{ padding: 16, gap: 10 }} accent={C.gold}>
            <SectionTitle title="Summary" accent={C.gold} right={<Banknote size={16} color={C.gold} />} />
            <Row label="User ID" value={studentId} color={C.cyan} />
            <Row label="Weeks Scored" value={String(scores.length)} />
            <Row label="Cumulative Weekly Score" value={`${cumulativeScore.toFixed(1)} pts`} color={C.green} />
            {latestRank != null ? <Row label="Latest Rank" value={`#${latestRank}`} color={C.cyan} /> : null}
          </GlassCard>
        </>
      )}
    </View>
  );
}
