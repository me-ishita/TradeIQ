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
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    analytics
      .getScores(studentId)
      .then((res) => setScores(res.scores))
      .catch(() => {
        setError(true);
        setScores([]);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const cumulativeScore = scores.reduce((sum, s) => sum + s.final_score, 0);
  const latestRank = scores.length > 0
    ? scores.reduce((a, b) => (a.week_number > b.week_number ? a : b)).rank_position
    : null;

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
      ) : error ? (
        <GlassCard style={{ padding: 16 }} accent={C.red}>
          <Text selectable style={{ color: C.red, fontSize: 13 }}>
            Failed to load scores. Please try again.
          </Text>
        </GlassCard>
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
