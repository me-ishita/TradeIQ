import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { C, font } from "../constants";
import { analytics } from "../api";
import type { BackendLeaderboardEntry } from "../api";
import { GlassCard, SectionTitle } from "../components/ui";

function StatCard({
  label, value, sub, color = C.cyan,
}: {
  label: string; value: string; sub: string; color?: string;
}) {
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

// Medal color for top 3, fallback for the rest
function rankColor(rank: number): string {
  if (rank === 1) return C.gold;
  if (rank === 2) return "#cfd6e6";
  if (rank === 3) return "#cd7f32";
  return C.text2;
}

export function Leaderboard({ studentId }: { studentId?: string }) {
  const [entries, setEntries] = useState<BackendLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analytics
      .getLeaderboard()
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const topScore = entries[0]?.final_score ?? 0;

  return (
    <View style={{ gap: 16 }}>
      {/* Header */}
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 29, textTransform: "uppercase" }}>
          Leaderboard
        </Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Weekly ranking blends performance, thesis quality, and risk governance.
        </Text>
      </View>

      {/* Summary stat cards */}
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <StatCard label="1st Prize" value="$1,000" sub="top score" color={C.gold} />
        <StatCard label="Participants" value={loading ? "…" : String(entries.length)} sub="registered" color={C.cyan} />
        <StatCard label="Top Score"    value={loading ? "…" : topScore.toFixed(1)}  sub="points / 100" color={C.green} />
      </View>

      {/* Score breakdown legend */}
      <GlassCard style={{ padding: 14, gap: 6 }} accent={C.cyan}>
        <SectionTitle title="Score Breakdown" accent={C.cyan} />
        {[
          ["Portfolio Performance", "40 pts", C.green],
          ["Risk Governance",       "20 pts", C.cyan],
          ["Thesis Quality",        "20 pts", C.purple],
          ["Execution",             "10 pts", C.gold],
          ["Strategy",              "10 pts", C.red],
        ].map(([label, pts, color]) => (
          <View key={label as string} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomColor: C.border, borderBottomWidth: 1 }}>
            <Text selectable style={{ color: C.text2, fontSize: 12 }}>{label}</Text>
            <Text selectable style={{ color: color as string, fontFamily: font.mono, fontSize: 12 }}>{pts}</Text>
          </View>
        ))}
      </GlassCard>

      {/* Rankings table */}
      <GlassCard style={{ padding: 12, gap: 2 }} accent={C.gold}>
        <SectionTitle
          title="Rankings"
          accent={C.gold}
          right={
            <Text selectable style={{ color: C.text2, fontFamily: font.mono, fontSize: 11 }}>
              {loading ? "" : `${entries.length} competitors`}
            </Text>
          }
        />

        {loading ? (
          <ActivityIndicator color={C.cyan} style={{ marginTop: 12 }} />
        ) : entries.length === 0 ? (
          <Text selectable style={{ color: C.text2, fontSize: 13, padding: 8 }}>
            No entries yet. Rankings appear after the first scoring run.
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {entries.map((entry, index) => {
              const rank = entry.rank_position ?? index + 1;
              const isMe = studentId && entry.user_id === studentId;
              const color = rankColor(rank);

              return (
                <View
                  key={entry.user_id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    marginVertical: 2,
                    backgroundColor: isMe
                      ? "rgba(49,230,255,0.08)"
                      : index % 2 === 0
                      ? "rgba(255,255,255,0.025)"
                      : "transparent",
                    borderWidth: isMe ? 1 : 0,
                    borderColor: isMe ? "rgba(49,230,255,0.30)" : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: rank <= 3 ? `${color}22` : "transparent",
                      borderWidth: rank <= 3 ? 1 : 0,
                      borderColor: `${color}55`,
                    }}
                  >
                    <Text selectable style={{ color, fontFamily: font.mono, fontSize: 13, fontWeight: "700" }}>
                      #{rank}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text selectable style={{ color: isMe ? C.cyan : C.text0, fontFamily: font.medium, fontSize: 14 }}>
                        {entry.full_name ?? entry.user_id}
                      </Text>
                      {isMe && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(49,230,255,0.15)", borderColor: "rgba(49,230,255,0.35)", borderWidth: 1 }}>
                          <Text selectable style={{ color: C.cyan, fontSize: 9, fontFamily: font.medium }}>YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text selectable style={{ color: C.text2, fontSize: 11, marginTop: 1 }}>
                      {entry.university ?? "—"}
                      {entry.team_name ? `  ·  ${entry.team_name}` : ""}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text selectable style={{ color: C.text0, fontFamily: font.mono, fontSize: 16, fontWeight: "700" }}>
                      {(entry.final_score ?? 0).toFixed(1)}
                      <Text style={{ color: C.text2, fontSize: 10 }}>/100</Text>
                    </Text>
                    {entry.portfolio_value != null && (
                      <Text selectable style={{ color: C.green, fontFamily: font.mono, fontSize: 11 }}>
                        ${entry.portfolio_value.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </GlassCard>
    </View>
  );
}
