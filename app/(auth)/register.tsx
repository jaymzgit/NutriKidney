import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import {
  ArrowRight,
  ChevronLeft,
  Heart,
  Leaf,
  Lock,
  LogIn,
  Mail,
  PartyPopper,
  ShieldAlert,
  User,
  Users,
  Zap,
} from "lucide-react-native";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import ScrollPicker from "@/components/ScrollPicker";
import GoogleIcon from "@/components/GoogleIcon";
import Banner from "@/components/Banner";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import IconButton from "@/components/IconButton";
import SectionTitle from "@/components/SectionTitle";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/theme";

const STEPS = [
  { title: "Create your account", subtitle: "Sign up to get started" },
  { title: "About you", subtitle: "Help us personalise your experience" },
  { title: "Health profile", subtitle: "Tell us about your kidney health" },
  { title: "Diet & lifestyle", subtitle: "Almost done!" },
];

const CKD_STAGES = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3a", label: "3a" },
  { value: "3b", label: "3b" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const CKD_STAGE_DESCRIPTIONS: Record<string, string> = {
  "1": "Normal GFR (≥90)",
  "2": "Mild decrease (60–89)",
  "3a": "Mild-moderate (45–59)",
  "3b": "Moderate-severe (30–44)",
  "4": "Severe decrease (15–29)",
  "5": "Kidney failure (<15)",
};

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
];

const DIETARY_PREFERENCES = [
  { value: "none", label: "No restriction" },
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
];

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);

  // Step 0: Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 1: About You
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // Step 2: Health
  const [ckdStage, setCkdStage] = useState<string | null>(null);
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasHypertension, setHasHypertension] = useState(false);
  const [latestEgfr, setLatestEgfr] = useState("");

  // Step 3: Lifestyle
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [dietaryPreference, setDietaryPreference] = useState<string | null>(
    null
  );
  const [foodAllergies, setFoodAllergies] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const canAdvance = () => {
    if (step === 0) return !!(email.trim() && password && confirmPassword);
    return true;
  };

  const handleNext = () => {
    setError("");
    if (step === 0 && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, {
        full_name: fullName.trim() || null,
        age: age ? Number(age) : null,
        gender: gender || null,
        weight_kg: weight ? Number(weight) : null,
        height_cm: height ? Number(height) : null,
        ckd_stage: ckdStage,
        has_diabetes: hasDiabetes,
        has_hypertension: hasHypertension,
        latest_egfr: latestEgfr ? Number(latestEgfr) : null,
        activity_level: activityLevel,
        dietary_preference: dietaryPreference,
        food_allergies: foodAllergies || null,
      });
      setInfo(
        "Account created. Check your email to confirm before logging in."
      );
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    }
  };

  const { title, subtitle } = STEPS[step];

  // ─── Success (peak moment) ───
  if (info) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4 w-full max-w-md self-center">
          <Card padded={false} className="p-6 items-center">
            <View className="h-24 w-24 rounded-full bg-primary-soft items-center justify-center mb-6">
              <PartyPopper size={44} color={colors.primary} />
            </View>
            <Text
              className="text-display font-bold text-foreground text-center"
              accessibilityRole="header"
            >
              You're all set{fullName.trim() ? `, ${fullName.trim().split(" ")[0]}` : ""}!
            </Text>
            <Text
              className="text-body text-muted-foreground text-center mt-4"
              accessibilityLiveRegion="polite"
            >
              {info}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Button icon={LogIn} className="self-stretch mt-8">
                Go to log in
              </Button>
            </Link>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Progress header */}
        <View className="px-4 pt-2 w-full max-w-md self-center">
          <View className="flex-row items-center min-h-touch">
            {step > 0 ? (
              <IconButton
                icon={ChevronLeft}
                accessibilityLabel="Previous step"
                onPress={() => setStep(step - 1)}
                className="-ml-2 mr-2"
              />
            ) : null}
            <Text className="text-caption font-bold text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </Text>
          </View>
          <View
            className="flex-row mt-2"
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}
          >
            {STEPS.map((_, i) => (
              <View
                key={i}
                className={`flex-1 h-2 rounded-full ${i <= step ? "bg-primary" : "bg-border"} ${
                  i < STEPS.length - 1 ? "mr-2" : ""
                }`}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md self-center flex-1">
            <View className="mt-6 mb-6">
              <Text
                className="text-display font-bold text-foreground"
                accessibilityRole="header"
              >
                {title}
              </Text>
              <Text className="text-body text-muted-foreground mt-2">{subtitle}</Text>
            </View>

            {error ? <Banner tone="danger" message={error} /> : null}

            <Card padded={false} className="p-5">
              {/* ─── Step 0: Account ─── */}
              {step === 0 && (
                <>
                  <TextField
                    label="Full name"
                    icon={User}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Tan Ah Kow"
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                  <TextField
                    label="Email"
                    icon={Mail}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                  />
                  <TextField
                    label="Password"
                    icon={Lock}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Choose a password"
                    secureTextEntry
                    autoComplete="password-new"
                  />
                  <TextField
                    label="Confirm password"
                    icon={Lock}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Type it again"
                    secureTextEntry
                    autoComplete="password-new"
                    containerClassName="mb-0"
                  />
                  <View className="flex-row items-center my-6">
                    <View className="flex-1 h-px bg-border" />
                    <Text className="mx-4 text-caption text-muted-foreground">or</Text>
                    <View className="flex-1 h-px bg-border" />
                  </View>
                  <Button variant="outline" onPress={handleGoogle}>
                    <GoogleIcon size={20} />
                    <Text className="text-body font-bold text-foreground ml-2">
                      Continue with Google
                    </Text>
                  </Button>
                </>
              )}

              {/* ─── Step 1: About You ─── */}
              {step === 1 && (
                <View>
                  <View className="flex-row mb-4">
                    <View className="flex-1 mr-2">
                      <ScrollPicker
                        label="Weight"
                        unit="kg"
                        value={weight ? Number(weight) : 60}
                        min={30}
                        max={200}
                        onChange={(v) => setWeight(String(v))}
                      />
                    </View>
                    <View className="flex-1 ml-2">
                      <ScrollPicker
                        label="Height"
                        unit="cm"
                        value={height ? Number(height) : 165}
                        min={100}
                        max={220}
                        onChange={(v) => setHeight(String(v))}
                      />
                    </View>
                  </View>
                  <ScrollPicker
                    label="Age"
                    unit="years"
                    value={age ? Number(age) : 30}
                    min={1}
                    max={120}
                    onChange={(v) => setAge(String(v))}
                  />
                  <SectionTitle icon={Users} title="Gender" className="mt-6 mb-2" />
                  <View className="flex-row flex-wrap" accessibilityRole="radiogroup">
                    {[
                      { v: "male", label: "Male" },
                      { v: "female", label: "Female" },
                    ].map(({ v, label }) => (
                      <Chip
                        key={v}
                        label={label}
                        selected={gender === v}
                        onPress={() => setGender(v)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* ─── Step 2: Health ─── */}
              {step === 2 && (
                <>
                  <SectionTitle icon={Heart} title="CKD stage" className="mb-2" />
                  <View className="flex-row flex-wrap" accessibilityRole="radiogroup">
                    {CKD_STAGES.map(({ value, label }) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={ckdStage === value}
                        onPress={() => setCkdStage(value)}
                        className="min-w-[64px]"
                      />
                    ))}
                  </View>
                  {ckdStage && CKD_STAGE_DESCRIPTIONS[ckdStage] ? (
                    <Text className="text-body text-muted-foreground mb-2">
                      Stage {ckdStage}: {CKD_STAGE_DESCRIPTIONS[ckdStage]}
                    </Text>
                  ) : (
                    <Text className="text-caption text-muted-foreground mb-2">
                      Not sure? Ask your doctor, or skip for now.
                    </Text>
                  )}

                  <SectionTitle icon={ShieldAlert} title="Other conditions" className="mt-6 mb-2" />
                  <View className="flex-row flex-wrap mb-4">
                    <Chip
                      role="checkbox"
                      label="Diabetes"
                      selected={hasDiabetes}
                      onPress={() => setHasDiabetes(!hasDiabetes)}
                    />
                    <Chip
                      role="checkbox"
                      label="Hypertension"
                      selected={hasHypertension}
                      onPress={() => setHasHypertension(!hasHypertension)}
                    />
                  </View>

                  <TextField
                    label="Latest eGFR (mL/min) — optional"
                    value={latestEgfr}
                    onChangeText={setLatestEgfr}
                    placeholder="e.g. 45"
                    keyboardType="numeric"
                    hint="You'll find this on your blood test report"
                    containerClassName="mb-0"
                  />
                </>
              )}

              {/* ─── Step 3: Lifestyle ─── */}
              {step === 3 && (
                <>
                  <SectionTitle icon={Zap} title="How active are you?" className="mb-2" />
                  <View className="flex-row flex-wrap mb-4" accessibilityRole="radiogroup">
                    {ACTIVITY_LEVELS.map(({ value, label }) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={activityLevel === value}
                        onPress={() => setActivityLevel(value)}
                      />
                    ))}
                  </View>

                  <SectionTitle icon={Leaf} title="Dietary preference" className="mb-2" />
                  <View className="flex-row flex-wrap mb-4" accessibilityRole="radiogroup">
                    {DIETARY_PREFERENCES.map(({ value, label }) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={dietaryPreference === value}
                        onPress={() => setDietaryPreference(value)}
                      />
                    ))}
                  </View>

                  <TextField
                    label="Food allergies or intolerances"
                    value={foodAllergies}
                    onChangeText={setFoodAllergies}
                    placeholder="e.g. peanuts, shellfish, dairy"
                    containerClassName="mb-0"
                  />
                </>
              )}
            </Card>

            {/* Navigation */}
            <View className="mt-6">
              {step < STEPS.length - 1 ? (
                <>
                  <Button onPress={handleNext} disabled={!canAdvance()}>
                    <Text className="text-body font-bold text-primary-foreground mr-2">
                      Next
                    </Text>
                    <ArrowRight size={20} color={colors.primaryForeground} />
                  </Button>
                  {step > 0 && (
                    <Button
                      variant="ghost"
                      className="mt-2"
                      onPress={() =>
                        step < STEPS.length - 1
                          ? setStep(step + 1)
                          : undefined
                      }
                    >
                      Skip for now
                    </Button>
                  )}
                </>
              ) : (
                <Button onPress={handleSubmit} loading={loading}>
                  Create account
                </Button>
              )}
            </View>

            {/* Footer */}
            <View className="items-center mt-6">
              <Text className="text-body text-muted-foreground">
                Already have an account?
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button variant="ghost">Log in</Button>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
