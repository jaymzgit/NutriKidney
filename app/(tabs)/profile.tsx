import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
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
  FlaskConical,
  Heart,
  Leaf,
  LogOut,
  Monitor,
  Moon,
  Palette as PaletteIcon,
  Save,
  Scale,
  ShieldAlert,
  Stethoscope,
  Sun,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react-native";
import Button from "@/components/Button";
import ScrollPicker from "@/components/ScrollPicker";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import SectionTitle from "@/components/SectionTitle";
import Chip from "@/components/Chip";
import SegmentedControl from "@/components/SegmentedControl";
import TextField from "@/components/TextField";
import ListRow from "@/components/ListRow";
import Banner from "@/components/Banner";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { tokens, useTheme } from "@/lib/theme";
import type { Palette, ThemePreference } from "@/lib/theme";

type WeightEntry = { id: string; weight_kg: number; recorded_at: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function stageFromEgfr(egfr: number): string | null {
  if (egfr >= 90) return "1";
  if (egfr >= 60) return "2";
  if (egfr >= 45) return "3a";
  if (egfr >= 30) return "3b";
  if (egfr >= 15) return "4";
  return "5";
}

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

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Auto", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/* ── Weight chart (SVG) ────────────────────────────── */

function WeightChart({
  data,
  width,
  colors,
  textScale,
  onPointPress,
}: {
  data: WeightEntry[];
  width: number;
  colors: Palette;
  textScale: number;
  onPointPress: (entry: WeightEntry) => void;
}) {
  if (data.length < 2) {
    return (
      <View className="items-center py-6">
        <Scale size={28} color={colors.mutedForeground} />
        <Text className="text-body text-muted-foreground mt-2 text-center">
          {data.length === 0
            ? "No weight data yet. Change your weight below to start tracking."
            : "Log your weight again to see a trend."}
        </Text>
      </View>
    );
  }

  const H = 200;
  const LABEL = (tokens.fontSize.caption[0] - 2) * textScale;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
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
  const maxXLabels = 4;
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
            <SvgLine x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={colors.border} strokeWidth={1} />
            <SvgText x={PAD.left - 8} y={y + 4} fontSize={LABEL} fill={colors.mutedForeground} textAnchor="end">
              {val}
            </SvgText>
          </G>
        );
      })}
      {/* Area fill */}
      <Path d={areaPath} fill={colors.primary} fillOpacity={0.12} />
      {/* Line */}
      <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" />
      {/* Dots — wide transparent hit area + visible inner dot */}
      {points.map((p, i) => (
        <G key={`d${i}`}>
          <SvgCircle cx={p.x} cy={p.y} r={22} fill="transparent" onPress={() => onPointPress(data[i])} />
          <SvgCircle
            cx={p.x}
            cy={p.y}
            r={6}
            fill={colors.primary}
            stroke={colors.card}
            strokeWidth={2}
            onPress={() => onPointPress(data[i])}
          />
        </G>
      ))}
      {/* X labels */}
      {data.map((d, i) => {
        if (i % xInterval !== 0 && i !== data.length - 1) return null;
        const label = new Date(d.recorded_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        return (
          <SvgText key={`x${i}`} x={points[i].x} y={H - 6} fontSize={LABEL} fill={colors.mutedForeground} textAnchor="middle">
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
  const { colors, preference, setPreference, textScale, setTextScale } = useTheme();
  const toast = useToast();
  const router = useRouter();

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
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedBasics = useRef<{ w: string; h: string; a: string } | null>(
    null
  );
  // One-shot guard: set right before a programmatic weight change (deleting
  // the latest history point) so the autosave effect doesn't re-insert a
  // duplicate weight_history row for the value that code just wrote.
  const suppressHistoryInsert = useRef(false);

  // Returns entries ascending (oldest first) so callers can read the latest
  // one after a mutation. Fetches newest-first, then reverses: with >60
  // entries, the old ascending+limit kept the OLDEST 60 and the chart
  // silently dropped recent weights.
  const fetchWeightHistory = useCallback(async (): Promise<WeightEntry[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("weight_history")
      .select("id, weight_kg, recorded_at")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(60);
    const entries: WeightEntry[] = data ? [...data].reverse() : [];
    setWeightHistory(entries);
    return entries;
  }, [user]);

  // Reset form to user values on focus (reverts unsaved changes on re-enter)
  useFocusEffect(
    useCallback(() => {
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
      fetchWeightHistory();
    }, [user, fetchWeightHistory])
  );

  // Auto-save weight/height/age (debounced 800ms after last change)
  useEffect(() => {
    if (!user) return;
    // One-shot: consumed on every run so a programmatic weight change (see
    // handleDeleteWeight) suppresses exactly one history insert, then clears.
    const suppressed = suppressHistoryInsert.current;
    suppressHistoryInsert.current = false;
    const key = { w: weight, h: height, a: age };
    // Skip initial sync from user values
    if (lastSavedBasics.current === null) {
      lastSavedBasics.current = key;
      return;
    }
    // No-op if unchanged
    if (
      lastSavedBasics.current.w === weight &&
      lastSavedBasics.current.h === height &&
      lastSavedBasics.current.a === age
    ) {
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const prevW = lastSavedBasics.current?.w;
        await updateProfile({
          weight_kg: weight ? Number(weight) : null,
          height_cm: height ? Number(height) : null,
          age: age ? Number(age) : null,
        });
        // Insert weight_history only if weight actually changed (and this
        // change wasn't initiated by the delete handler)
        if (weight && weight !== prevW && !suppressed) {
          const { error: whErr } = await supabase
            .from("weight_history")
            .insert({ user_id: user.id, weight_kg: Number(weight) });
          if (!whErr) await fetchWeightHistory();
          else console.log("[weight_history] insert failed:", whErr.message);
        }
        lastSavedBasics.current = key;
      } catch (e: any) {
        console.log("[autosave] failed:", e?.message);
      } finally {
        setAutoSaving(false);
      }
    }, 800);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [weight, height, age, user, updateProfile, fetchWeightHistory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ckd_stage: ckdStage,
        gender: gender || null,
        has_diabetes: hasDiabetes,
        has_hypertension: hasHypertension,
        activity_level: activityLevel,
        dietary_preference: dietaryPreference,
        food_allergies: foodAllergies || null,
        latest_egfr: latestEgfr ? Number(latestEgfr) : null,
        diagnosis_date: diagnosisDate || null,
      });

      toast("Profile saved");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeight = useCallback(
    (entry: WeightEntry) => {
      if (!user) return;
      Alert.alert(
        "Delete weight entry?",
        `${entry.weight_kg} kg on ${fmtDate(entry.recorded_at)}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const ts = (s: string) => new Date(s).getTime();
              // Deleting a point that isn't the newest only changes the chart.
              const wasLatest = !weightHistory.some(
                (e) => ts(e.recorded_at) > ts(entry.recorded_at)
              );

              const { error } = await supabase
                .from("weight_history")
                .delete()
                .eq("id", entry.id);
              if (error) {
                Alert.alert("Error", error.message);
                return;
              }
              const remaining = await fetchWeightHistory();
              if (!wasLatest) return;

              // The newest point is gone — fall the profile weight back to the
              // new newest entry (or clear it when history is now empty),
              // otherwise the dashboard keeps using the deleted value.
              const newLatest = remaining[remaining.length - 1] ?? null;
              const nextW = newLatest ? String(newLatest.weight_kg) : "";

              // Drop any pending autosave — it captured the old weight and
              // would write it straight back.
              if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current);
                autoSaveTimer.current = null;
              }

              // Sync the autosave baseline + suppress the history insert so
              // the autosave effect doesn't re-create the deleted row.
              suppressHistoryInsert.current = true;
              lastSavedBasics.current = { w: nextW, h: height, a: age };

              setWeight(nextW);
              try {
                // Include height/age: clearing the pending timer above would
                // otherwise drop an in-flight edit to those fields.
                await updateProfile({
                  weight_kg: newLatest ? newLatest.weight_kg : null,
                  height_cm: height ? Number(height) : null,
                  age: age ? Number(age) : null,
                });
              } catch (e: any) {
                console.log(
                  "[weight_history] profile sync after delete failed:",
                  e?.message
                );
              }
            },
          },
        ]
      );
    },
    [user, weightHistory, fetchWeightHistory, height, age, updateProfile]
  );

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

  const suggestedStage = latestEgfr ? stageFromEgfr(Number(latestEgfr)) : null;

  return (
    <Screen header={<ScreenHeader title="Profile" />}>
      {/* User card */}
      <Card className="mb-4">
        <View className="flex-row items-center">
          <View className="h-14 w-14 rounded-full bg-primary-soft items-center justify-center">
            <Text className="text-title font-bold text-primary">{initial}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-title font-bold text-foreground">
              {user?.full_name || "User"}
            </Text>
            <Text className="text-caption text-muted-foreground" numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>
      </Card>

      {/* Display */}
      <Card className="mb-4">
        <SectionTitle icon={PaletteIcon} title="Display" />
        <Text className="text-caption font-bold text-muted-foreground mb-2">Theme</Text>
        <SegmentedControl options={THEME_OPTIONS} value={preference} onChange={setPreference} />
        <Text className="text-caption text-muted-foreground mt-2">
          {preference === "system"
            ? "Follows your phone's light or dark setting."
            : preference === "dark"
            ? "Dark background — easier on the eyes at night."
            : "Light background — best in bright rooms."}
        </Text>

        <Text className="text-caption font-bold text-muted-foreground mt-6 mb-2">
          Text size
        </Text>
        <View className="flex-row -mx-1" accessibilityRole="radiogroup">
          {tokens.textScales.map(({ value, label }, i) => {
            const selected = textScale === value;
            return (
              <Pressable
                key={value}
                onPress={() => setTextScale(value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${label} text`}
                className="flex-1 px-1"
              >
                <View
                  className={`min-h-touch rounded-sm border items-center justify-center py-2 ${
                    selected ? "border-primary bg-primary-soft" : "border-border bg-card"
                  }`}
                >
                  <Text
                    style={{
                      fontSize: 15 + i * 4,
                      fontWeight: tokens.fontWeight.bold,
                      color: selected ? colors.primary : colors.foreground,
                    }}
                  >
                    A
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className={`text-caption text-center mt-1 ${
                    selected ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="bg-muted rounded-sm p-4 mt-4">
          <Text className="text-body text-foreground">
            This is how text will look. Your meals, limits and results will all use this size.
          </Text>
        </View>
      </Card>

      <ListRow
        icon={FlaskConical}
        title="Lab reports"
        subtitle="Scan and keep your blood test results"
        onPress={() => router.navigate("/(tabs)/lab-reports")}
        className="mb-4"
      />

      {/* Weight History Graph */}
      <Card className="mb-4">
        <SectionTitle
          icon={TrendingUp}
          title="Weight history"
          action={
            autoSaving ? (
              <Text className="text-caption text-muted-foreground">Saving…</Text>
            ) : undefined
          }
        />
        {weight ? (
          <View className="flex-row items-baseline mb-2">
            <Text className="text-display font-bold text-foreground">{weight}</Text>
            <Text className="text-body text-muted-foreground ml-1">kg</Text>
            {weightDelta != null && weightDelta !== 0 && (
              <Text
                className={`text-body font-bold ml-4 ${
                  weightDelta > 0 ? "text-caution" : "text-primary"
                }`}
              >
                {weightDelta > 0 ? "▲ +" : "▼ "}
                {weightDelta.toFixed(1)} kg
              </Text>
            )}
          </View>
        ) : null}
        <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <WeightChart
              data={weightHistory}
              width={chartWidth}
              colors={colors}
              textScale={textScale}
              onPointPress={handleDeleteWeight}
            />
          )}
          {weightHistory.length >= 2 && (
            <Text className="text-caption text-muted-foreground text-center mt-2">
              Tap a point to delete that entry
            </Text>
          )}
        </View>
      </Card>

      {/* Body Measurements */}
      <Card className="mb-4">
        <SectionTitle icon={Activity} title="Body measurements" className="mb-2" />
        <Text className="text-caption text-muted-foreground mb-4">
          These save automatically when you change them.
        </Text>
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
      </Card>

      <Banner
        tone="info"
        message="The sections below are saved when you tap Save profile at the bottom."
      />

      {/* CKD Stage */}
      <Card className="mb-4">
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
          <Text className="text-body text-muted-foreground">
            Stage {ckdStage}: {CKD_STAGE_DESCRIPTIONS[ckdStage]}
          </Text>
        ) : null}
        {latestEgfr && suggestedStage !== ckdStage ? (
          <Pressable
            onPress={() => setCkdStage(stageFromEgfr(Number(latestEgfr)))}
            accessibilityRole="button"
            className="mt-4 bg-primary-soft border border-primary/30 rounded-sm p-4 active:opacity-80"
          >
            <Text className="text-body text-foreground">
              Based on your eGFR of {latestEgfr}, your stage may be{" "}
              <Text className="font-bold">{suggestedStage}</Text>.
            </Text>
            <Text className="text-body font-bold text-primary mt-1">
              Tap to use stage {suggestedStage}
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Gender + Health Conditions */}
      <Card className="mb-4">
        <SectionTitle icon={Users} title="Gender" className="mb-2" />
        <View className="flex-row flex-wrap mb-4" accessibilityRole="radiogroup">
          {[
            { v: "male", label: "Male" },
            { v: "female", label: "Female" },
          ].map(({ v, label }) => (
            <Chip key={v} label={label} selected={gender === v} onPress={() => setGender(v)} />
          ))}
        </View>
        <SectionTitle icon={ShieldAlert} title="Other conditions" className="mb-2" />
        <Text className="text-caption text-muted-foreground mb-2">
          These affect your nutrient recommendations
        </Text>
        <View className="flex-row flex-wrap">
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
      </Card>

      {/* Activity Level */}
      <Card className="mb-4">
        <SectionTitle icon={Zap} title="Activity level" className="mb-2" />
        <View className="flex-row flex-wrap" accessibilityRole="radiogroup">
          {ACTIVITY_LEVELS.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={activityLevel === value}
              onPress={() => setActivityLevel(value)}
            />
          ))}
        </View>
      </Card>

      {/* Dietary Preference */}
      <Card className="mb-4">
        <SectionTitle icon={Leaf} title="Dietary preference" className="mb-2" />
        <View className="flex-row flex-wrap mb-2" accessibilityRole="radiogroup">
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
      </Card>

      {/* Clinical Info */}
      <Card className="mb-6">
        <SectionTitle icon={Stethoscope} title="Clinical info" />
        <TextField
          label="Latest eGFR (mL/min)"
          value={latestEgfr}
          onChangeText={setLatestEgfr}
          placeholder="e.g. 45"
          keyboardType="numeric"
        />
        <TextField
          label="Diagnosis date"
          icon={Calendar}
          value={diagnosisDate}
          onChangeText={setDiagnosisDate}
          placeholder="YYYY-MM"
          hint="Year and month, e.g. 2021-06"
          containerClassName="mb-0"
        />
      </Card>

      <Button onPress={handleSave} loading={saving} icon={Save} className="mb-4">
        Save profile
      </Button>

      <Button variant="destructive-outline" icon={LogOut} onPress={handleLogout}>
        Sign out
      </Button>
    </Screen>
  );
}
