import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { AlertTriangle, ChevronRight, Flame, FlaskConical, Utensils } from "lucide-react-native";
import { useAuth } from "@/lib/AuthContext";
import { getLimitsForStage } from "@/lib/ckdLimits";
import { getRiskLevel } from "@/lib/riskEngine";
import NutrientProgressBar from "@/components/NutrientProgressBar";
import MealCard, { Meal } from "@/components/MealCard";
import { NutrientAlertData } from "@/components/NutrientAlert";
import { dummyMeals } from "@/lib/dummyData";

const meals: Meal[] = dummyMeals; // TODO: wire to FastAPI /logs

export default function Home() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const todayMeals = useMemo(() => {
    const today = new Date().toDateString();
    return meals.filter(
      (m) => new Date(m.logged_at).toDateString() === today
    );
  }, []);

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        potassium: acc.potassium + (meal.total_potassium || 0),
        phosphorus: acc.phosphorus + (meal.total_phosphorus || 0),
        sodium: acc.sodium + (meal.total_sodium || 0),
        protein: acc.protein + (meal.total_protein || 0),
      }),
      { calories: 0, potassium: 0, phosphorus: 0, sodium: 0, protein: 0 }
    );
  }, [todayMeals]);

  const ckdStage = user?.ckd_stage ?? null;
  const limits = getLimitsForStage(ckdStage);
  const risk = getRiskLevel(totals, ckdStage);

  const streak = useMemo(() => {
    const days = new Set(meals.map((m) => new Date(m.logged_at).toDateString()));
    let count = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, []);

  const nutrientAlerts = useMemo<NutrientAlertData[]>(() => {
    if (!ckdStage) return [];
    const checks: NutrientAlertData[] = [
      { key: "potassium", label: "Potassium", unit: "mg", total: totals.potassium, limit: limits.potassium },
      { key: "phosphorus", label: "Phosphorus", unit: "mg", total: totals.phosphorus, limit: limits.phosphorus },
      { key: "sodium", label: "Sodium", unit: "mg", total: totals.sodium, limit: limits.sodium },
      { key: "protein", label: "Protein", unit: "g", total: totals.protein, limit: limits.protein },
    ];
    return checks
      .filter((c) => c.total > c.limit)
      .map((c) => {
        let topItem: string | null = null;
        let topVal = 0;
        todayMeals.forEach((meal) => {
          meal.meal_items?.forEach((item: any) => {
            const v = item[c.key] || 0;
            if (v > topVal) {
              topVal = v;
              topItem = item.food_name;
            }
          });
        });
        return { ...c, topItem, topVal };
      });
  }, [totals, limits, ckdStage, todayMeals]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.full_name?.trim().split(" ")[0] || "User";
  const todayDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const calPct = Math.min(
    limits.calories > 0 ? (totals.calories / limits.calories) * 100 : 0,
    100
  );

  const riskColors: Record<string, { bg: string; badgeBg: string; badgeText: string }> = {
    safe: { bg: "#0F6B47", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700" },
    caution: { bg: "#B8841B", badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
    danger: { bg: "#B91C1C", badgeBg: "bg-red-100", badgeText: "text-red-700" },
    unknown: { bg: "#475569", badgeBg: "bg-slate-100", badgeText: "text-slate-600" },
  };
  const rc = riskColors[risk.level] || riskColors.unknown;

  const radius = 20;
  const circ = 2 * Math.PI * radius;

  return (
    <View className="flex-1 bg-background">
      <View style={{ height: insets.top, backgroundColor: "#FFFFFF" }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A7A55"
            colors={["#1A7A55"]}
          />
        }
      >
        <View
          className="px-5 pt-6 pb-5 mb-4 overflow-hidden"
          style={{
            backgroundColor: rc.bg,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View className="flex-row items-start justify-between mb-3">
            <View>
              <Text className="text-white/80 text-[15px] font-medium">
                {greeting}
              </Text>
              <Text className="text-white text-[28px] font-bold">
                {firstName}
              </Text>
              <Text className="text-white/75 text-[13px] mt-0.5">
                {todayDate}
              </Text>
            </View>
            <View className="bg-white/25 rounded-xl px-3.5 py-2 border border-white/30 items-center">
              <Text className="text-white/85 text-[13px] font-semibold uppercase">
                CKD
              </Text>
              <Text className="text-white text-[22px] font-bold">
                {ckdStage ?? "—"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-white/15 rounded-xl px-4 py-3.5 border border-white/25">
            <View className="relative items-center justify-center">
              <Svg
                width={52}
                height={52}
                viewBox="0 0 52 52"
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                <Circle
                  cx={26}
                  cy={26}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={5}
                />
                <Circle
                  cx={26}
                  cy={26}
                  r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={`${(calPct / 100) * circ} ${circ}`}
                />
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-white text-[13px] font-bold">
                  {Math.round(calPct)}%
                </Text>
              </View>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-white/85 text-[13px] font-semibold uppercase">
                Calories Today
              </Text>
              <Text className="text-white text-[24px] font-bold">
                {Math.round(totals.calories)}
                <Text className="text-white/80 text-[15px] font-normal">
                  {" "}
                  / {limits.calories} kcal
                </Text>
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-white/70 text-[9px] font-semibold uppercase mb-1">
                Nutrients
              </Text>
              <View className={`px-2.5 py-1 rounded-full ${rc.badgeBg}`}>
                <Text className={`text-[11px] font-bold uppercase ${rc.badgeText}`}>
                  {risk.level === "safe"
                    ? "On track"
                    : risk.level === "caution"
                    ? "Caution"
                    : risk.level === "danger"
                    ? "Exceeded"
                    : "No stage"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4">
          <View className="flex-row -mx-1.5 mb-4">
            <View className="flex-1 px-1.5">
              <View className="bg-card rounded-2xl border border-border px-3 py-2.5">
                <Utensils size={14} color="#2783A6" />
                <Text className="text-base font-bold text-foreground mt-1.5">
                  {todayMeals.length}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  logged
                </Text>
                <Text className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                  Meals Today
                </Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <View className="bg-card rounded-2xl border border-border px-3 py-2.5">
                <Flame
                  size={14}
                  color={streak > 0 ? "#F97316" : "#9CA3AF"}
                />
                <Text className="text-base font-bold text-foreground mt-1.5">
                  {streak}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  day{streak !== 1 ? "s" : ""}
                </Text>
                <Text className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                  Streak
                </Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <Link href="/(tabs)/lab-reports" asChild>
                <Pressable className="bg-card rounded-2xl border border-border px-3 py-2.5">
                  <FlaskConical size={14} color={"#1A7A55"} />
                  <Text className="text-base font-bold text-primary leading-none mt-1.5">
                    View
                  </Text>
                  <Text className="text-base font-bold text-primary leading-none mt-0.5">Results</Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase mt-1.5">
                    Lab Reports
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {nutrientAlerts.length > 0 ? (
            <Link href="/alerts" asChild>
              <Pressable className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-2 flex-row items-center">
                <View className="h-8 w-8 bg-red-100 rounded-full items-center justify-center">
                  <AlertTriangle size={16} color="#DC2626" />
                </View>
                <Text className="flex-1 ml-3 text-sm font-bold text-red-700">
                  Nutrient limits exceeded
                </Text>
                <View className="h-6 min-w-6 px-1.5 bg-red-600 rounded-full items-center justify-center mr-2">
                  <Text className="text-[11px] font-bold text-white">
                    {nutrientAlerts.length}
                  </Text>
                </View>
                <ChevronRight size={18} color="#DC2626" />
              </Pressable>
            </Link>
          ) : null}

          <View className="bg-card rounded-2xl border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-bold text-foreground">
                Nutrient Tracking
              </Text>
              {!ckdStage ? (
                <Link href="/(tabs)/profile" asChild>
                  <Pressable>
                    <Text className="text-xs text-primary font-medium">
                      Set stage →
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
            {!ckdStage ? (
              <View className="bg-muted/60 rounded-xl px-3 py-2 mb-3">
                <Text className="text-xs text-muted-foreground italic text-center">
                  Set your CKD stage in Profile for personalised limits
                </Text>
              </View>
            ) : null}
            <NutrientProgressBar
              label="Potassium"
              nutrientKey="potassium"
              current={totals.potassium}
              limit={limits.potassium}
              unit="mg"
              isUnknown={!ckdStage}
            />
            <NutrientProgressBar
              label="Phosphorus"
              nutrientKey="phosphorus"
              current={totals.phosphorus}
              limit={limits.phosphorus}
              unit="mg"
              isUnknown={!ckdStage}
            />
            <NutrientProgressBar
              label="Sodium"
              nutrientKey="sodium"
              current={totals.sodium}
              limit={limits.sodium}
              unit="mg"
              isUnknown={!ckdStage}
            />
            <NutrientProgressBar
              label="Protein"
              nutrientKey="protein"
              current={totals.protein}
              limit={limits.protein}
              unit="g"
              isUnknown={!ckdStage}
            />
          </View>

          <View className="bg-card rounded-2xl border border-border p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-bold text-foreground">
                Today's Meals
              </Text>
              <View className="bg-muted px-2.5 py-1 rounded-full">
                <Text className="text-xs text-muted-foreground font-semibold">
                  {todayMeals.length}
                </Text>
              </View>
            </View>
            {todayMeals.length === 0 ? (
              <View className="items-center py-8">
                <View className="h-16 w-16 bg-muted rounded-2xl items-center justify-center mb-3">
                  <Utensils size={28} color="#9CA3AF" />
                </View>
                <Text className="text-sm text-muted-foreground mb-4">
                  No meals logged today
                </Text>
                <Link href="/(tabs)/scan" asChild>
                  <Pressable className="bg-primary px-5 py-2.5 rounded-xl">
                    <Text className="text-primary-foreground text-sm font-semibold">
                      Log your first meal
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              todayMeals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}