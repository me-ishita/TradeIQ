import { BookOpen, BriefcaseBusiness, ChevronRight, GraduationCap, Target } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, font } from "../constants";
import { AppButton, GlassCard, HeaderMini, StepDots } from "../components/ui";

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const modules = [
    {
      title: "What This Challenge Is",
      Icon: GraduationCap,
      color: C.cyan,
      body: "A premium learning competition where students experience investment banking, sales and trading, and portfolio risk thinking through a structured paper-capital simulation.",
      points: ["Designed for students and early learners.", "Built to teach process, discipline, and presentation.", "No prior finance background required."],
    },
    {
      title: "How It Works",
      Icon: BriefcaseBusiness,
      color: C.purple,
      body: "You receive $10,000 in paper capital, build a portfolio from the approved universe, and explain your investment thesis like an analyst.",
      points: ["Allocate across assets and sectors.", "Track performance versus benchmark references.", "Submit strategy notes and rebalance decisions."],
    },
    {
      title: "Scoring System",
      Icon: Target,
      color: C.green,
      body: "Your final score rewards both returns and reasoning, so strong strategy can beat lucky performance.",
      points: ["50% portfolio performance.", "50% strategy quality and risk awareness.", "Leaderboard updates after review cycles."],
    },
    {
      title: "Educational Purpose",
      Icon: BookOpen,
      color: C.gold,
      body: "The purpose is to understand investing, risk, market behavior, and professional communication in a safe learning environment.",
      points: ["All market data is for educational reference.", "No actual trades or securities.", "No investment advice."],
    },
  ] as const;
  const item = modules[step];
  const Icon = item.Icon;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg0 }} edges={["top", "left", "right"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        <HeaderMini title="Onboarding" subtitle="Understand the rules before you compete" />
        <StepDots current={1} />
        <GlassCard style={{ padding: 20, gap: 16 }} accent={item.color}>
          <View style={{ width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: `${item.color}22`, borderColor: `${item.color}55`, borderWidth: 1 }}>
            <Icon size={32} color={item.color} />
          </View>
          <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 28, textTransform: "uppercase" }}>
            {item.title}
          </Text>
          <Text selectable style={{ color: C.text1, fontFamily: font.regular, fontSize: 14, lineHeight: 22 }}>
            {item.body}
          </Text>
          <View style={{ gap: 10 }}>
            {item.points.map((point) => (
              <View key={point} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color, marginTop: 7 }} />
                <Text selectable style={{ color: C.text1, fontFamily: font.regular, fontSize: 13, lineHeight: 20, flex: 1 }}>
                  {point}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {modules.map((module, index) => (
              <View key={module.title} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: index <= step ? item.color : C.bg3 }} />
            ))}
          </View>
          <AppButton label={step === modules.length - 1 ? "Continue to Course Fees" : "Next"} onPress={() => (step === modules.length - 1 ? onComplete() : setStep((current) => current + 1))} icon={<ChevronRight size={18} color={C.green} />} />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
