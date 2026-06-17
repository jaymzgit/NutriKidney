import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import {
  ChevronLeft,
  Heart,
  Leaf,
  Lock,
  Mail,
  ShieldAlert,
  User,
  UserPlus,
  Zap,
} from "lucide-react-native";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import ScrollPicker from "@/components/ScrollPicker";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

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
  { value: "5d_hd", label: "5D HD" },
  { value: "5d_pd", label: "5D PD" },
];

const CKD_STAGE_DESCRIPTIONS: Record<string, string> = {
  "1": "Normal GFR (\u226590)",
  "2": "Mild decrease (60\u201389)",
  "3a": "Mild-moderate (45\u201359)",
  "3b": "Moderate-severe (30\u201344)",
  "4": "Severe decrease (15\u201329)",
  "5": "Kidney failure (<15)",
  "5d_hd": "Hemodialysis",
  "5d_pd": "Peritoneal dialysis",
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

function RadioCard({
  label,
  desc,
  selected,
  onPress,
}: {
  label: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${
        selected ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        {desc ? (
          <Text className="text-xs text-muted-foreground mt-0.5">{desc}</Text>
        ) : null}
      </View>
      {selected ? (
        <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
          <View className="h-2 w-2 rounded-full bg-white" />
        </View>
      ) : null}
    </Pressable>
  );
}

function TogglePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2.5 rounded-lg border mr-2 mb-2 ${
        active ? "border-primary bg-primary/5" : "border-border bg-muted"
      }`}
    >
      <Text
        className={`text-sm ${
          active ? "text-primary font-semibold" : "text-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <Icon size={16} color="#1A7A55" />
      <Text className="text-sm font-bold text-foreground ml-2">{label}</Text>
    </View>
  );
}

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {step > 0 && (
          <Pressable
            onPress={() => setStep(step - 1)}
            className="flex-row items-center px-4 pt-2 pb-1"
          >
            <ChevronLeft size={20} color="#1A7A55" />
            <Text className="text-primary text-sm font-medium ml-1">Back</Text>
          </Pressable>
        )}

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md self-center flex-1">
            {/* Step indicator */}
            <View className="flex-row items-center justify-center mt-4 mb-6">
              {STEPS.map((_, i) => (
                <View key={i} className="flex-row items-center">
                  <View
                    className={`h-2 rounded-full ${
                      i <= step ? "bg-primary" : "bg-border"
                    } ${i === step ? "w-6" : "w-2"}`}
                  />
                  {i < STEPS.length - 1 && <View className="w-2" />}
                </View>
              ))}
            </View>

            {/* Title */}
            <View className="items-center mb-6">
              <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mb-3">
                <UserPlus size={24} color="#FFFFFF" />
              </View>
              <Text className="text-2xl font-bold text-foreground text-center">
                {title}
              </Text>
              <Text className="text-muted-foreground mt-1 text-center">
                {subtitle}
              </Text>
            </View>

            {error ? (
              <View className="mb-4 p-3 rounded-lg bg-destructive/10">
                <Text className="text-destructive text-sm">{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View className="mb-4 p-3 rounded-lg bg-primary/10">
                <Text className="text-primary text-sm">{info}</Text>
              </View>
            ) : null}

            {/* Step content */}
            <View className="bg-card rounded-2xl border border-border p-5">
              {/* ─── Step 0: Account ─── */}
              {step === 0 && (
                <>
                  <Button
                    variant="outline"
                    className="mb-5"
                    onPress={handleGoogle}
                  >
                    <View className="flex-row items-center">
                      <GoogleIcon size={20} />
                      <Text className="text-sm font-medium text-foreground ml-2">
                        Continue with Google
                      </Text>
                    </View>
                  </Button>
                  <View className="flex-row items-center mb-5">
                    <View className="flex-1 h-px bg-border" />
                    <Text className="mx-3 text-xs uppercase text-muted-foreground">
                      or
                    </Text>
                    <View className="flex-1 h-px bg-border" />
                  </View>
                  <TextField
                    label="Full Name"
                    icon={User}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="John Doe"
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
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete="password-new"
                  />
                  <TextField
                    label="Confirm Password"
                    icon={Lock}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete="password-new"
                  />
                </>
              )}

              {/* ─── Step 1: About You ─── */}
              {step === 1 && (
                <View>
                  <View className="flex-row gap-3 mb-3">
                    <View className="flex-1">
                      <ScrollPicker
                        label="Weight"
                        unit="kg"
                        value={weight ? Number(weight) : 60}
                        min={30}
                        max={200}
                        onChange={(v) => setWeight(String(v))}
                      />
                    </View>
                    <View className="flex-1">
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
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <ScrollPicker
                        label="Age"
                        unit="yrs"
                        value={age ? Number(age) : 30}
                        min={1}
                        max={120}
                        onChange={(v) => setAge(String(v))}
                      />
                    </View>
                    <View className="flex-1 rounded-2xl border border-border bg-muted/50 overflow-hidden">
                      <View className="px-4 pt-3 pb-1">
                        <Text className="text-xs font-medium text-muted-foreground">
                          Gender
                        </Text>
                      </View>
                      <View className="flex-1 justify-center px-3 pb-3 gap-3">
                        {[
                          { v: "male", label: "Male" },
                          { v: "female", label: "Female" },
                        ].map(({ v, label }) => (
                          <Pressable
                            key={v}
                            onPress={() => setGender(v)}
                            className={`flex-1 rounded-lg border flex-row items-center justify-center ${
                              gender === v
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card"
                            }`}
                          >
                            <Text
                              className={`text-sm font-bold ${
                                gender === v
                                  ? "text-primary"
                                  : "text-foreground"
                              }`}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ─── Step 2: Health ─── */}
              {step === 2 && (
                <>
                  <SectionLabel icon={Heart} label="CKD Stage" />
                  {CKD_STAGES.map(({ value, label, desc }) => (
                    <RadioCard
                      key={value}
                      label={label}
                      desc={desc}
                      selected={ckdStage === value}
                      onPress={() => setCkdStage(value)}
                    />
                  ))}

                  <SectionLabel icon={ShieldAlert} label="Health Conditions" />
                  <View className="flex-row flex-wrap mb-2">
                    <TogglePill
                      label="Diabetes"
                      active={hasDiabetes}
                      onPress={() => setHasDiabetes(!hasDiabetes)}
                    />
                    <TogglePill
                      label="Hypertension"
                      active={hasHypertension}
                      onPress={() => setHasHypertension(!hasHypertension)}
                    />
                  </View>

                  <Text className="text-xs font-medium text-muted-foreground mt-2 mb-1">
                    Latest eGFR (mL/min) — optional
                  </Text>
                  <TextInput
                    value={latestEgfr}
                    onChangeText={setLatestEgfr}
                    placeholder="e.g. 45"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    className="h-10 px-3 rounded-lg bg-muted border border-border text-sm text-foreground"
                  />
                </>
              )}

              {/* ─── Step 3: Lifestyle ─── */}
              {step === 3 && (
                <>
                  <SectionLabel icon={Zap} label="Activity Level" />
                  {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
                    <RadioCard
                      key={value}
                      label={label}
                      desc={desc}
                      selected={activityLevel === value}
                      onPress={() => setActivityLevel(value)}
                    />
                  ))}

                  <SectionLabel icon={Leaf} label="Dietary Preference" />
                  <View className="flex-row flex-wrap mb-2">
                    {DIETARY_PREFERENCES.map(({ value, label }) => (
                      <TogglePill
                        key={value}
                        label={label}
                        active={dietaryPreference === value}
                        onPress={() => setDietaryPreference(value)}
                      />
                    ))}
                  </View>

                  <Text className="text-xs font-medium text-muted-foreground mt-2 mb-1">
                    Food allergies or intolerances
                  </Text>
                  <TextInput
                    value={foodAllergies}
                    onChangeText={setFoodAllergies}
                    placeholder="e.g. peanuts, shellfish, dairy"
                    placeholderTextColor="#9CA3AF"
                    className="h-10 px-3 rounded-lg bg-muted border border-border text-sm text-foreground"
                  />
                </>
              )}
            </View>

            {/* Navigation */}
            {!info && (
              <View className="mt-4">
                {step < STEPS.length - 1 ? (
                  <>
                    <Button onPress={handleNext} disabled={!canAdvance()}>
                      Next
                    </Button>
                    {step > 0 && (
                      <Pressable
                        onPress={() =>
                          step < STEPS.length - 1
                            ? setStep(step + 1)
                            : undefined
                        }
                        className="mt-2 items-center py-2"
                      >
                        <Text className="text-sm text-muted-foreground">
                          Skip for now
                        </Text>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <Button onPress={handleSubmit} loading={loading}>
                    Create account
                  </Button>
                )}
              </View>
            )}

            {/* Footer */}
            <View className="items-center mt-6 mb-8">
              <Text className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/(auth)/login"
                  className="text-primary font-medium"
                >
                  Log in
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
