import { useEffect, useState } from "react";
import { useFonts as useLoraFonts, Lora_400Regular, Lora_600SemiBold, Lora_700Bold } from "@expo-google-fonts/lora";
import { useFonts as useNeutonFonts, Neuton_700Bold, Neuton_800ExtraBold } from "@expo-google-fonts/neuton";
import { ActivityIndicator, View } from "react-native";
import type { Flow, UserData } from "./types";
import { getActiveUser, saveRegisteredUser, signInUser } from "./auth-store";
import { LandingPage } from "./pages/landing-page";
import { RegistrationPage } from "./pages/registration-page";
import { OnboardingPage } from "./pages/onboarding-page";
import { PaymentPage } from "./pages/payment-page";
import { MainApp } from "./pages/main-app";
import { SignInPage } from "./pages/sign-in-page";

export default function ChallengeApp() {
  const [flow, setFlow] = useState<Flow>("landing");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [booting, setBooting] = useState(true);
  const [loraLoaded] = useLoraFonts({ Lora_400Regular, Lora_600SemiBold, Lora_700Bold });
  const [neutonLoaded] = useNeutonFonts({ Neuton_700Bold, Neuton_800ExtraBold });

  useEffect(() => {
    let active = true;
    getActiveUser().then((activeUser) => {
      if (!active) return;
      if (activeUser) {
        setUserData(activeUser);
        setFlow("app");
      }
      setBooting(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (booting || !loraLoaded || !neutonLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060810" }}>
        <ActivityIndicator color="#31E6FF" />
      </View>
    );
  }

  if (flow === "landing") return <LandingPage onExplore={() => setFlow("register")} />;
  if (flow === "signin") {
    return (
      <SignInPage
        onBack={() => setFlow("landing")}
        onSubmit={async (email, password) => {
          try {
            const user = await signInUser(email, password);
            if (!user) return null;
            setUserData(user);
            setFlow("app");
            return user;
          } catch (err) {
            return err instanceof Error ? err.message : "Sign in failed";
          }
        }}
      />
    );
  }
  if (flow === "register") {
    return (
      <RegistrationPage
        onSignIn={() => setFlow("signin")}
        onSubmit={async (data) => {
          const savedUser = await saveRegisteredUser(data);
          setUserData(savedUser);
          setFlow("onboarding");
        }}
      />
    );
  }
  if (flow === "onboarding") return <OnboardingPage onComplete={() => setFlow("payment")} />;
  if (flow === "payment") return <PaymentPage onComplete={() => setFlow("app")} />;
  return <MainApp userData={userData} onLogout={() => {
    setUserData(null);
    setFlow("landing");
  }} />;
}
