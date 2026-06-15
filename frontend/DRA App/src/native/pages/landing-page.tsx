import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { ChevronRight } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { brandLogo, C, font, heroVideo, prizePoolImage, tradeIqLogo } from "../constants";
import { MarketTicker } from "../components/market-ticker";
import { AppButton } from "../components/ui";

export function LandingPage({ onExplore }: { onExplore: () => void }) {
  const player = useVideoPlayer(heroVideo, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg0 }} edges={["top", "left", "right"]}>
      <VideoView player={player} nativeControls={false} contentFit="cover" style={{ position: "absolute", inset: 0, opacity: 0.58 }} />
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(5,8,18,0.54)" }} />
      <MarketTicker />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, padding: 22, paddingBottom: 24 }}>
        <View style={{ alignItems: "center", paddingTop: 54, gap: 10 }}>
          <Image source={brandLogo} style={{ width: 58, height: 58, borderRadius: 14, borderWidth: 1, borderColor: C.border2 }} />
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text selectable style={{ color: C.text1, fontFamily: font.medium, fontSize: 16 }}>
              Digital Risk Academy
            </Text>
            <Text selectable style={{ color: C.text2, fontFamily: font.regular, fontSize: 12 }}>
              presents
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14, paddingTop: 34, paddingBottom: 20 }}>
          <Image source={tradeIqLogo} contentFit="contain" style={{ width: "100%", maxWidth: 520, aspectRatio: 3.6 }} />
          <View style={{ alignSelf: "center", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "rgba(30,230,163,0.11)", borderColor: "rgba(30,230,163,0.42)", borderWidth: 1 }}>
            <Text selectable style={{ color: C.green, fontFamily: font.medium, fontSize: 11 }}>
              Paper capital $10,000 | Educational simulation
            </Text>
          </View>
          <Text selectable style={{ color: C.silver, fontFamily: font.headingHeavy, fontSize: 31, lineHeight: 36, textAlign: "center", maxWidth: 760, textTransform: "uppercase", textShadowColor: "rgba(255,255,255,0.52)", textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } }}>
            Investment Banking Sales & Trading Risk Challenge
          </Text>
          <Text selectable style={{ color: C.text1, fontFamily: font.regular, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 640 }}>
            Build a portfolio, defend your strategy, and compete in a premium fintech simulation designed for students.
          </Text>

          <View style={{ width: "100%", maxWidth: 820, borderRadius: 16, overflow: "hidden", borderColor: "rgba(49,230,255,0.48)", borderWidth: 1, backgroundColor: "rgba(5,8,18,0.62)", boxShadow: "0 18px 50px rgba(49,230,255,0.16), inset 0 1px 0 rgba(255,255,255,0.14)" }}>
            <Image source={prizePoolImage} contentFit="contain" style={{ width: "100%", aspectRatio: 1.82 }} />
          </View>

          <View style={{ marginTop: 10, gap: 10 }}>
            <AppButton label="Get Started" onPress={onExplore} icon={<ChevronRight size={18} color={C.green} />} />
          </View>
          <Text selectable style={{ color: C.text2, fontFamily: font.regular, fontSize: 11, lineHeight: 17 }}>
            No real money. No real securities. Built for structured investing education.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
