import { useEffect, useState } from "react";
import { Award } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { C, font } from "../constants";
import { analytics } from "../api";
import type { BackendScoreMetrics, BackendWeeklyScore } from "../api";
import { GlassCard, Progress, SectionTitle } from "../components/ui";

function Row({ label, value, color = C.text1 }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: C.border, borderBottomWidth: 1 }}>
      <Text selectable style={{ color: C.text2, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text selectable style={{ color, fontFamily: font.mono, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

function ScoreMetricCard({ label, value, max, color = C.cyan }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={{ flex: 1, minWidth: 160, padding: 14, borderRadius: 8, backgroundColor: "rgba(5,8,18,0.72)", borderColor: C.border, borderWidth: 1, gap: 12 }}>
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

export function Scores({ studentId }: { studentId: string }) {
  const [scores, setScores] = useState<BackendWeeklyScore[]>([]);
  const [metrics, setMetrics] = useState<BackendScoreMetrics | null>(null);
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
      setMetrics(res.latest_metrics);
    })
    .catch(() => {
      setError(true);
      setScores([]);
      setMetrics(null);
    })
    .finally(() => setLoading(false));
}, [studentId]);

  const cumulativeScore = scores.reduce((sum, s) => sum + s.final_score, 0);
  const latestRank = scores.length > 0
    ? scores.reduce((a, b) => (a.week_number > b.week_number ? a : b)).rank_position
    : null;

  const latestWeekScore = scores.length > 0
    ? scores.reduce((a, b) => (a.week_number > b.week_number ? a : b))
    : null;

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.medium, fontSize: 25 }}>Scores</Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Weekly score breakdown — updated after each scoring run.
        </Text>
      </View>

      <GlassCard style={{ padding: 16, gap: 8 }} accent={C.cyan}>
        <SectionTitle title="How Scores Are Calculated" accent={C.cyan} />
        <Text selectable style={{ color: C.text2, fontSize: 12, lineHeight: 18 }}>
          Clean Slate: If no active holdings exist, all scores remain 0/100.

          Portfolio Score (40): Based on Return on Capital relative to the initial $10,000 virtual budget.

          Risk Score (20): Based on diversification across sectors. Three or more sectors receive full points.

          Thesis Score (20): Uses AI evaluation when available. Active portfolios awaiting AI review receive a baseline score of 15.

          Execution Score (10): Baseline execution quality score of 8.

          Strategy Score (10): Rewards diversification across multiple active positions.
        </Text>
      </GlassCard>

      {loading ? (
        <ActivityIndicator color={C.cyan} />
      ) : error ? (
        <GlassCard style={{ padding: 16 }} accent={C.red}>
          <Text selectable style={{ color: C.red, fontSize: 13 }}>
            Failed to load scores. Please try again.
          </Text>
        </GlassCard>
      ) : scores.length === 0 ? (
        <GlassCard style={{ padding: 16 }} accent={C.cyan}>
          <Text selectable style={{ color: C.text2, fontSize: 13 }}>
            No scores yet. Submit at least one stock with a thesis to generate your score.
          </Text>
        </GlassCard>
      ) : (
        <>
          {metrics ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <GlassCard style={{ flex: 1, minWidth: 190, padding: 14 }} accent={C.green}>
                <SectionTitle title="Portfolio Value" accent={C.green} />
                <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 22, marginTop: 8 }}>
                  ${metrics.portfolio_value.toLocaleString()}
                </Text>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 190, padding: 14 }} accent={metrics.desk_return_expansion >= 0 ? C.cyan : C.red}>
                <SectionTitle title="Desk Return & Expansion" accent={metrics.desk_return_expansion >= 0 ? C.cyan : C.red} />
                <Text selectable style={{ color: metrics.desk_return_expansion >= 0 ? C.cyan : C.red, fontFamily: font.mono, fontSize: 22, marginTop: 8 }}>
                  {metrics.desk_return_expansion.toFixed(2)}%
                </Text>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 190, padding: 14 }} accent={C.gold}>
                <SectionTitle title="Available Cash Depot" accent={C.gold} />
                <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 22, marginTop: 8 }}>
                  ${metrics.available_cash_depot.toLocaleString()}
                </Text>
              </GlassCard>
            </View>
          ) : null}

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
                  Calculated from portfolio discipline, thesis quality, and execution data.
                </Text>
              </View>
              <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(49,230,255,0.38)", backgroundColor: "rgba(49,230,255,0.08)", alignItems: "center" }}>
                <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 9, textTransform: "uppercase" }}>
                  Total Score
                </Text>
                <Text selectable style={{ color: C.cyan, fontFamily: font.mono, fontSize: 30 }}>
                  {Math.round(latestWeekScore?.final_score ?? 0)}<Text style={{ color: C.text2, fontSize: 13 }}>/100</Text>
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
              <ScoreMetricCard label="Portfolio Perf" value={latestWeekScore?.portfolio_score ?? 0} max={40} color={C.green} />
              <ScoreMetricCard label="Risk Gov" value={latestWeekScore?.risk_score ?? 0} max={20} color={C.cyan} />
              <ScoreMetricCard label="Thesis Qual" value={latestWeekScore?.thesis_score ?? 0} max={20} color={C.purple} />
              <ScoreMetricCard label="Execution" value={latestWeekScore?.execution_score ?? 0} max={10} color={C.gold} />
              <ScoreMetricCard label="Strategy" value={latestWeekScore?.strategy_score ?? 0} max={10} color={C.red} />
            </View>
          </GlassCard>

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
                <Progress label="Portfolio Perf (40)" value={Math.round((week.portfolio_score / 40) * 100)} color={C.green} />
                <Progress label="Risk Gov (20)" value={Math.round((week.risk_score / 20) * 100)} color={C.cyan} />
                <Progress label="Thesis Qual (20)" value={Math.round((week.thesis_score / 20) * 100)} color={C.purple} />
                <Progress label="Execution (10)" value={Math.round((week.execution_score / 10) * 100)} color={C.gold} />
                <Progress label="Strategy (10)" value={Math.round((week.strategy_score / 10) * 100)} color={C.red} />
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
