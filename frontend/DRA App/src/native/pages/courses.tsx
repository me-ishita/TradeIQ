import { BookOpen, ChevronRight } from "lucide-react-native";
import { Text, View } from "react-native";
import { C, font } from "../constants";
import { GlassCard, Progress, SectionTitle } from "../components/ui";

export function Courses() {
  const courses = [
    ["Portfolio Fundamentals", "4 of 6 modules", 67, C.purple],
    ["Reading Market Signals", "1 of 4 modules", 25, C.green],
    ["Valuation Methods", "Upcoming", 0, C.gold],
    ["Risk Frameworks", "Upcoming", 0, C.red],
  ] as const;

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 29, textTransform: "uppercase" }}>
          Courses
        </Text>
        <Text selectable style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>
          Modules and mentor sessions for better investment reasoning.
        </Text>
      </View>
      {courses.map(([title, meta, progress, color]) => (
        <GlassCard key={title} style={{ padding: 16, gap: 12 }} accent={color}>
          <SectionTitle title={title} accent={color} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: `${color}20`, alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text selectable style={{ color: C.text2, fontSize: 12, marginTop: 3 }}>
                {meta}
              </Text>
            </View>
            <ChevronRight size={18} color={C.text2} />
          </View>
          <Progress label="Progress" value={progress} color={color} />
        </GlassCard>
      ))}
    </View>
  );
}
