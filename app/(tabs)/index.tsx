import { useCallback, useMemo, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Activity, Camera, Flame, FlaskConical, Utensils } from "lucide-react-native";
import { useAuth } from "@/lib/AuthContext";
import { getLimitsForStage } from "@/lib/ckdLimits";
import { getRiskLevel } from "@/lib/riskEngine";
import { useTheme } from "@/lib/theme";
import NutrientProgressBar from "@/components/NutrientProgressBar";
import MealCard from "@/components/MealCard";
import { NutrientAlertData } from "@/components/NutrientAlert";
import { useMeals } from "@/lib/useMeals";
import { computeStreaks } from "@/lib/streak";
import Screen from "@/components/Screen";
import Card from "@/components/Card";
import SectionTitle from "@/components/SectionTitle";
import StatusBadge, { STATUS, toStatus } from "@/components/StatusBadge";
import Banner from "@/components/Banner";
import ListRow from "@/components/ListRow";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";

const RISK_LABEL: Record<string, string> = {
  safe: "On track",
  caution: "Caution",
  danger: "Exceeded",
  unknown: "No stage",
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { meals, loading, error, refetch } = useMeals();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const todayMeals = useMemo(() => {
    const today = new Date().toDateString();
    return meals.filter(
      (m) => new Date(m.logged_at).toDateString() === today
    );
  }, [meals]);

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
  const weightKg = user?.weight_kg ?? null;
  const limits = getLimitsForStage(ckdStage, weightKg);
  const risk = getRiskLevel(totals, ckdStage, weightKg);

  const streakStats = useMemo(() => computeStreaks(meals), [meals]);
  const streak = streakStats.current;

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

  const level = toStatus(risk.level);
  const status = STATUS[level];

  const radius = 40;
  const circ = 2 * Math.PI * radius;

  const initialLoad = loading && meals.length === 0 && !refreshing;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.card}
        />
      }
    >
      {/* Greeting */}
      <View className="flex-row items-start pt-4 pb-6">
        <View className="flex-1">
          <Text className="text-title font-bold text-foreground" accessibilityRole="header">
            {greeting}, {firstName}
          </Text>
          <Text className="text-body text-muted-foreground mt-1">{todayDate}</Text>
        </View>
        <View
          className="bg-primary-soft rounded-sm px-4 py-2 items-center ml-2"
          accessible
          accessibilityLabel={ckdStage ? `CKD stage ${ckdStage}` : "CKD stage not set"}
        >
          <Text className="text-caption font-bold text-primary">CKD stage</Text>
          <Text className="text-title font-bold text-primary">{ckdStage ?? "—"}</Text>
        </View>
      </View>

      {initialLoad ? (
        <LoadingState label="Loading today's meals…" />
      ) : error ? (
        <Card>
          <ErrorState
            title="Couldn't load your meals"
            message="Your daily totals can't be shown right now. Check your connection and try again."
            onRetry={refetch}
          />
        </Card>
      ) : (
        <>
          {/* Today's status — the one thing to notice first */}
          <View className={`rounded-lg p-5 mb-4 ${status.bgClass}`}>
            <StatusBadge level={level} label={RISK_LABEL[risk.level] ?? RISK_LABEL.unknown} />
            <Text className="text-title font-bold text-foreground mt-4">
              {risk.message}
            </Text>

            <View className="flex-row items-center mt-6">
              <View
                className="items-center justify-center"
                accessible
                accessibilityLabel={`${Math.round(calPct)} percent of daily calories`}
              >
                <Svg
                  width={96}
                  height={96}
                  viewBox="0 0 96 96"
                  style={{ transform: [{ rotate: "-90deg" }] }}
                >
                  <Circle cx={48} cy={48} r={radius} fill="none" stroke={colors.card} strokeWidth={10} />
                  <Circle
                    cx={48}
                    cy={48}
                    r={radius}
                    fill="none"
                    stroke={colors[status.fg]}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${(calPct / 100) * circ} ${circ}`}
                  />
                </Svg>
                <View className="absolute inset-0 items-center justify-center">
                  <Text className="text-body font-bold text-foreground">
                    {Math.round(calPct)}%
                  </Text>
                </View>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-caption font-bold text-muted-foreground">
                  Calories today
                </Text>
                <Text className="text-display font-bold text-foreground">
                  {Math.round(totals.calories)}
                </Text>
                <Text className="text-body text-muted-foreground">
                  of {limits.calories} kcal
                </Text>
              </View>
            </View>
          </View>

          {nutrientAlerts.length > 0 ? (
            <Banner
              tone="danger"
              title={`${nutrientAlerts.length} nutrient${nutrientAlerts.length > 1 ? "s" : ""} over your limit`}
              message="Tap to see which foods and what to swap"
              onPress={() => router.push("/alerts")}
            />
          ) : null}

          {/* Nutrients */}
          <Card className="mb-4">
            <SectionTitle icon={Activity} title="Today's nutrients" />
            {!ckdStage ? (
              <Banner
                tone="info"
                title="Set your CKD stage"
                message="Get limits made for you in Profile"
                onPress={() => router.navigate("/(tabs)/profile")}
              />
            ) : !weightKg ? (
              <Banner
                tone="caution"
                title="Add your weight"
                message="For accurate calorie & protein limits"
                onPress={() => router.navigate("/(tabs)/profile")}
              />
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
          </Card>

          {/* Quick stats */}
          <View className="flex-row mb-4">
            <Card className="flex-1 mr-2">
              <Utensils size={20} color={colors.info} />
              <Text className="text-display font-bold text-foreground mt-2">
                {todayMeals.length}
              </Text>
              <Text className="text-caption text-muted-foreground">
                meal{todayMeals.length !== 1 ? "s" : ""} today
              </Text>
            </Card>
            <Card
              className="flex-1 ml-2"
              onPress={() => router.navigate("/streak")}
              accessibilityLabel={`${streak} day streak. Open streak dashboard`}
              accessibilityHint="Shows which days you logged meals"
            >
              <Flame size={20} color={streak > 0 ? colors.caution : colors.mutedForeground} />
              <Text className="text-display font-bold text-foreground mt-2">{streak}</Text>
              <Text className="text-caption text-muted-foreground">
                day{streak !== 1 ? "s" : ""} in a row
              </Text>
            </Card>
          </View>

          <ListRow
            icon={FlaskConical}
            title="Lab reports"
            subtitle="Scan and keep your blood test results"
            onPress={() => router.navigate("/(tabs)/lab-reports")}
            className="mb-4"
          />

          {/* Today's meals */}
          <Card>
            <SectionTitle
              icon={Utensils}
              title="Today's meals"
              action={
                todayMeals.length > 0 ? (
                  <Text className="text-caption font-bold text-muted-foreground">
                    {todayMeals.length} logged
                  </Text>
                ) : undefined
              }
            />
            {todayMeals.length === 0 ? (
              <EmptyState
                icon={Utensils}
                title="Nothing logged yet today"
                message="Take a photo of your meal and we'll check it against your limits."
                action={{
                  label: "Log a meal",
                  icon: Camera,
                  onPress: () => router.navigate("/(tabs)/scan"),
                }}
              />
            ) : (
              todayMeals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </Card>
        </>
      )}

      <Text className="text-caption text-muted-foreground text-center mt-8 px-2">
        NutriKidney is for informational purposes only and is not a substitute
        for professional medical advice, diagnosis, or treatment. Always consult
        your nephrologist or dietitian before making dietary changes.
      </Text>
    </Screen>
  );
}
