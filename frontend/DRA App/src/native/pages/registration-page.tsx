import { ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, font } from "../constants";
import { generateStudentId } from "../auth-store";
import type { UserData } from "../types";
import { formatDobInput, getAge, parseDob } from "../utils";
import { AppButton, ErrorNotice, Field, GlassCard, HeaderMini, Pill, StepDots } from "../components/ui";

export function RegistrationPage({ onSubmit, onSignIn }: { onSubmit: (data: UserData) => void | Promise<void>; onSignIn: () => void }) {
  const [form, setForm] = useState<UserData>({
    studentId: "",
    fullName: "",
    age: "",
    dateOfBirth: "",
    email: "",
    phoneNumber: "",
    university: "",
    course: "",
    yearOfStudy: "",
    participationType: "Individual",
    teamName: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    generateStudentId().then((studentId) => {
      if (active) setForm((prev) => ({ ...prev, studentId }));
    });
    return () => {
      active = false;
    };
  }, []);

  const dob = parseDob(form.dateOfBirth);
  const requiredComplete =
    form.fullName.trim() &&
    form.dateOfBirth.trim() &&
    form.email.trim() &&
    form.phoneNumber.trim() &&
    form.university.trim() &&
    form.password.trim() &&
    form.studentId.trim() &&
    (form.participationType === "Individual" || form.teamName.trim());

  const canContinue = Boolean(requiredComplete && !submitting);

  const set = (key: keyof UserData) => (value: string) => {
    setSubmitError("");
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  const phoneValid = (value: string) => value.replace(/\D/g, "").length === 10;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const parsedDob = parseDob(form.dateOfBirth);
    if (!parsedDob) nextErrors.dateOfBirth = "Enter date of birth in DD/MM/YYYY format.";
    else if (getAge(parsedDob) < 18) nextErrors.dateOfBirth = "You must be at least 18 years old to create an account.";
    if (!emailValid(form.email)) nextErrors.email = "Enter a valid email address, for example name@university.edu.";
    if (!phoneValid(form.phoneNumber)) nextErrors.phoneNumber = "Enter a valid 10 digit phone number.";
    if (form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (form.participationType === "Team" && !form.teamName.trim()) nextErrors.teamName = "Enter your team name.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = async () => {
    setSubmitError("");
    if (!validate()) return;
    const parsedDob = parseDob(form.dateOfBirth);
    if (!parsedDob) return;
    try {
      setSubmitting(true);
      await onSubmit({ ...form, phoneNumber: form.phoneNumber.replace(/\D/g, ""), age: String(getAge(parsedDob)) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setSubmitError(message.toLowerCase().includes("email") ? "An account with this email already exists. Login or use another email." : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg0 }} edges={["top", "left", "right"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        <HeaderMini title="Create your Account" subtitle="" />
        <StepDots current={0} />
        <GlassCard style={{ padding: 18, gap: 15 }} accent={C.purple}>
         
          <Field label="Full Name" value={form.fullName} onChangeText={set("fullName")} placeholder="John Smith" />
          <Field
            label="Date of Birth"
            value={form.dateOfBirth}
            onChangeText={(value) => {
              setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
              setSubmitError("");
              const next = formatDobInput(value);
              const parsed = parseDob(next);
              setForm((prev) => ({ ...prev, dateOfBirth: next, age: parsed ? String(getAge(parsed)) : prev.age }));
            }}
            placeholder="DD/MM/YYYY"
            keyboardType="numeric"
            error={errors.dateOfBirth}
          />
          <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="john@university.edu" keyboardType="email-address" error={errors.email} />
          <Field label="Phone Number" value={form.phoneNumber} onChangeText={(value) => set("phoneNumber")(value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" keyboardType="phone-pad" error={errors.phoneNumber} />
          <Field label="University" value={form.university} onChangeText={set("university")} placeholder="NYU" />
          <Field label="Course / Program" value={form.course} onChangeText={set("course")} placeholder="MBA Finance" />
          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: C.text2, fontFamily: font.medium, fontSize: 11, textTransform: "uppercase" }}>
              Participation Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["Individual", "Team"] as const).map((option) => (
                <Pill key={option} label={option} active={form.participationType === option} onPress={() => setForm((prev) => ({ ...prev, participationType: option }))} />
              ))}
            </ScrollView>
          </View>
          <Field label="Team Name" value={form.teamName} onChangeText={set("teamName")} placeholder="Alpha Fund (blank if individual)" error={errors.teamName} />
          <Field label="Password" value={form.password} onChangeText={set("password")} placeholder="Minimum 6 characters" secureTextEntry showPasswordToggle error={errors.password} />
          {submitError ? <ErrorNotice message={submitError} /> : null}
          <AppButton label={submitting ? "Creating Account..." : "Continue to Onboarding"} onPress={handleContinue} disabled={!canContinue} icon={<ChevronRight size={18} color={C.green} />} />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
            <Text selectable style={{ color: C.text2, fontFamily: font.regular, fontSize: 12 }}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 12 }}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
