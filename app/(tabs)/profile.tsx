import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle as SvgCircle,
  G,
  Line as SvgLine,
  Path,
  Text as SvgText,
} from "react-native-svg";
import {
  Activity,
  Calendar,
  Heart,
  Leaf,
  LogOut,
  Scale,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  User,
  Zap,
} from "lucide-react-native";
import Button from "@/components/Button";
import ScrollPicker from "@/components/ScrollPicker";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

type WeightEntry = { weight_kg: number; recorded_at: string };

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
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "Light exercise 1\u20133 days/wk" },
  { value: "moderate", label: "Moderate", desc: "Moderate exercise 3\u20135 days/wk" },
  { value: "active", label: "Active", desc: "Hard exercise 6\u20137 days/wk" },
];

const DIETARY_PREFERENCES = [
  { value: "none", label: "No restriction" },
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
];

/* ── Shared UI helpers ─────────────────────────────── */

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <View className="flex-row items-center mb-4">
      <Icon size={16} color="#1A7A55" />
      <Text className="text-sm font-bold text-foreground ml-2">{label}</Text>
    </View>
  );
}

function TogglePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2.5 rounded-lg border mr-2 mb-2 ${active ? "border-primary bg-primary/5" : "border-border bg-muted"}`}
    >
      <Text className={`text-sm ${active ? "text-primary font-semibold" : "text-foreground"}`}>{label}</Text>
    </Pressable>
  );
}

function RadioCard({ label, desc, selected, onPress }: { label: string; desc?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${selected ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        {desc ? <Text className="text-xs text-muted-foreground mt-0.5">{desc}</Text> : null}
      </View>
      {selected ? (
        <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
          <View className="h-2 w-2 rounded-full bg-white" />
        </View>
      ) : null}
    </Pressable>
  );
}

/* ── Weight chart (SVG) ────────────────────────────── */

function WeightChart({ data, width }: { data: WeightEntry[]; width: number }) {
  if (data.length < 2) {
    return (
      <View className="items-center py-6">
        <Scale size={24} color="#9CA3AF" />
        <Text className="text-xs text-muted-foreground mt-2">
          {data.length === 0 ? "No weight data yet" : "Log weight again to see trends"}
        </Text>
      </View>
    );
  }

  const H = 160;
  const PAD = { top: 12, right: 12, bottom: 24, left: 36 };
  const cw = width - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const weights = data.map((d) => d.weight_kg);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  const range = maxW - minW || 1;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * cw,
    y: PAD.top + ch - ((d.weight_kg - minW) / range) * ch,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + ch).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD.top + ch).toFixed(1)} Z`;

  const gridCount = 4;
  const maxXLabels = 5;
  const xInterval = Math.max(1, Math.ceil(data.length / maxXLabels));

  return (
    <Svg width={width} height={H}>
      {/* Grid + Y labels */}
      {Array.from({ length: gridCount + 1 }).map((_, i) => {
        const t = i / gridCount;
        const y = PAD.top + ch - t * ch;
        const val = (minW + t * range).toFixed(0);
        return (
          <G key={`g${i}`}>
            <SvgLine x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke="#E5E7EB" strokeWidth={0.5} />
            <SvgText x={PAD.left - 6} y={y + 3} fontSize={9} fill="#9CA3AF" textAnchor="end">
              {val}
            </SvgText>
          </G>
        );
      })}
      {/* Area fill */}
      <Path d={areaPath} fill="#1A7A55" fillOpacity={0.08} />
      {/* Line */}
      <Path d={linePath} fill="none" stroke="#1A7A55" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <SvgCircle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill="#1A7A55" />
      ))}
      {/* X labels */}
      {data.map((d, i) => {
        if (i % xInterval !== 0 && i !== data.length - 1) return null;
        const label = new Date(d.recorded_at + "T00:00:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        return (
          <SvgText key={`x${i}`} x={points[i].x} y={H - 4} fontSize={8} fill="#9CA3AF" textAnchor="middle">
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/* ── Profile screen ────────────────────────────────── */

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();

  const [ckdStage, setCkdStage] = useState<string | null>(user?.ckd_stage ?? null);
  const [weight, setWeight] = useState(user?.weight_kg ? String(user.weight_kg) : "");
  const [height, setHeight] = useState(user?.height_cm ? String(user.height_cm) : "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [gender, setGender] = useState<string>(user?.gender ?? "");

  const [hasDiabetes, setHasDiabetes] = useState(user?.has_diabetes ?? false);
  const [hasHypertension, setHasHypertension] = useState(user?.has_hypertension ?? false);

  const [activityLevel, setActivityLevel] = useState<string | null>(user?.activity_level ?? null);
  const [dietaryPreference, setDietaryPreference] = useState<string | null>(user?.dietary_preference ?? null);
  const [foodAllergies, setFoodAllergies] = useState(user?.food_allergies ?? "");

  const [latestEgfr, setLatestEgfr] = useState(user?.latest_egfr ? String(user.latest_egfr) : "");
  const [diagnosisDate, setDiagnosisDate] = useState(user?.diagnosis_date ?? "");

  const [saving, setSaving] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [chartWidth, setChartWidth] = useState(0);

  const fetchWeightHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weight_history")
      .select("weight_kg, recorded_at")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true })
      .limit(30);
    if (data) setWeightHistory(data);
  }, [user]);

  useEffect(() => {
    fetchWeightHistory();
  }, [fetchWeightHistory]);

  useEffect(() => {
    if (user) {
      setCkdStage(user.ckd_stage ?? null);
      setWeight(user.weight_kg ? String(user.weight_kg) : "");
      setHeight(user.height_cm ? String(user.height_cm) : "");
      setAge(user.age ? String(user.age) : "");
      setGender(user.gender ?? "");
      setHasDiabetes(user.has_diabetes ?? false);
      setHasHypertension(user.has_hypertension ?? false);
      setActivityLevel(user.activity_level ?? null);
      setDietaryPreference(user.dietary_preference ?? null);
      setFoodAllergies(user.food_allergies ?? "");
      setLatestEgfr(user.latest_egfr ? String(user.latest_egfr) : "");
      setDiagnosisDate(user.diagnosis_date ?? "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ckd_stage: ckdStage,
        weight_kg: weight ? Number(weight) : null,
        height_cm: height ? Number(height) : null,
        age: age ? Number(age) : null,
        gender: gender || null,
        has_diabetes: hasDiabetes,
        has_hypertension: hasHypertension,
        activity_level: activityLevel,
        dietary_preference: dietaryPreference,
        food_allergies: foodAllergies || null,
        latest_egfr: latestEgfr ? Number(latestEgfr) : null,
        diagnosis_date: diagnosisDate || null,
      });

      // Log weight to history (non-blocking — table may not exist yet)
      if (weight && user) {
        supabase
          .from("weight_history")
          .upsert(
            {
              user_id: user.id,
              weight_kg: Number(weight),
              recorded_at: new Date().toISOString().split("T")[0],
            },
            { onConflict: "user_id,recorded_at" }
          )
          .then(() => fetchWeightHistory());
      }

      Alert.alert("Saved", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const initial = user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  // Weight delta from previous entry
  const weightDelta =
    weightHistory.length >= 2
      ? weightHistory[weightHistory.length - 1].weight_kg -
        weightHistory[weightHistory.length - 2].weight_kg
      : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <User size={20} color="#1A7A55" />
          <Text className="text-lg font-bold text-foreground ml-3">Profile</Text>
        </View>

        {/* User card */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-xl font-bold text-primary">{initial}</Text>
            </View>
            <View className="ml-4">
              <Text className="text-base font-bold text-foreground">
                {user?.full_name || "User"}
              </Text>
              <Text className="text-xs text-muted-foreground">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Weight History Graph */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <SectionHeader icon={TrendingUp} label="Weight History" />
            {weight ? (
              <View className="flex-row items-baseline">
                <Text className="text-lg font-bold text-foreground">{weight}</Text>
                <Text className="text-xs text-muted-foreground ml-1">kg</Text>
                {weightDelta != null && weightDelta !== 0 && (
                  <Text
                    className={`text-xs font-medium ml-2 ${
                      weightDelta > 0 ? "text-amber-600" : "text-primary"
                    }`}
                  >
                    {weightDelta > 0 ? "+" : ""}
                    {weightDelta.toFixed(1)}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
          <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
            {chartWidth > 0 && <WeightChart data={weightHistory} width={chartWidth} />}
          </View>
        </View>

        {/* CKD Stage */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={Heart} label="CKD Stage" />
          <View className="flex-row flex-wrap -mx-1 mb-1">
            {CKD_STAGES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setCkdStage(value)}
                className={`px-3.5 py-2 rounded-lg border mx-1 mb-2 ${
                  ckdStage === value
                    ? "border-primary bg-primary"
                    : "border-border bg-muted"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    ckdStage === value ? "text-white" : "text-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {ckdStage && CKD_STAGE_DESCRIPTIONS[ckdStage] ? (
            <Text className="text-xs text-muted-foreground">
              {CKD_STAGE_DESCRIPTIONS[ckdStage]}
            </Text>
          ) : null}
        </View>

        {/* Body Measurements */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={Activity} label="Body Measurements" />
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
                <Text className="text-xs font-medium text-muted-foreground">Gender</Text>
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
                      gender === v ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${gender === v ? "text-primary" : "text-foreground"}`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Health Conditions */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={ShieldAlert} label="Health Conditions" />
          <Text className="text-xs text-muted-foreground mb-3">
            These affect your nutrient recommendations
          </Text>
          <View className="flex-row flex-wrap">
            <TogglePill label="Diabetes" active={hasDiabetes} onPress={() => setHasDiabetes(!hasDiabetes)} />
            <TogglePill label="Hypertension" active={hasHypertension} onPress={() => setHasHypertension(!hasHypertension)} />
          </View>
        </View>

        {/* Activity Level */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={Zap} label="Activity Level" />
          <Text className="text-xs text-muted-foreground mb-3">
            Affects your daily calorie target (25\u201335 kcal/kg)
          </Text>
          {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
            <RadioCard
              key={value}
              label={label}
              desc={desc}
              selected={activityLevel === value}
              onPress={() => setActivityLevel(value)}
            />
          ))}
        </View>

        {/* Dietary Preference */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={Leaf} label="Dietary Preference" />
          <View className="flex-row flex-wrap">
            {DIETARY_PREFERENCES.map(({ value, label }) => (
              <TogglePill
                key={value}
                label={label}
                active={dietaryPreference === value}
                onPress={() => setDietaryPreference(value)}
              />
            ))}
          </View>
          <Text className="text-xs font-medium text-muted-foreground mt-3 mb-1">
            Food allergies or intolerances
          </Text>
          <TextInput
            value={foodAllergies}
            onChangeText={setFoodAllergies}
            placeholder="e.g. peanuts, shellfish, dairy"
            placeholderTextColor="#9CA3AF"
            className="px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground"
          />
        </View>

        {/* Clinical Info */}
        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <SectionHeader icon={Stethoscope} label="Clinical Info" />
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <Text className="text-xs font-medium text-muted-foreground mb-1">
                Latest eGFR (mL/min)
              </Text>
              <TextInput
                value={latestEgfr}
                onChangeText={setLatestEgfr}
                placeholder="e.g. 45"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="flex-row items-center mb-1">
                <Calendar size={12} color="#6B7280" />
                <Text className="text-xs font-medium text-muted-foreground ml-1">Diagnosis date</Text>
              </View>
              <TextInput
                value={diagnosisDate}
                onChangeText={setDiagnosisDate}
                placeholder="YYYY-MM"
                placeholderTextColor="#9CA3AF"
                className="px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </View>
          </View>
        </View>

        <Button onPress={handleSave} loading={saving} className="mb-4">
          Save Profile
        </Button>

        <Button variant="destructive-outline" onPress={handleLogout}>
          <View className="flex-row items-center">
            <LogOut size={16} color="#DC2D27" />
            <Text className="text-destructive font-semibold ml-2">Sign Out</Text>
          </View>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
