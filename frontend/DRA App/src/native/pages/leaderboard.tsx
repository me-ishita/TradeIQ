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
                  {(entry.final_score ?? 0).toFixed(1)}
                </Text>
                <Text selectable style={{ color: C.green, fontFamily: font.mono, fontSize: 11 }}>
                  +{(entry.portfolio_score ?? 0).toFixed(1)} pts
                </Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>
    </View>
  );
}
