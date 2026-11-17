import { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Camera, Utensils } from "lucide-react-native";
import MealHistoryItem from "@/components/MealHistoryItem";
import type { Meal } from "@/components/MealCard";
import { useAuth } from "@/lib/AuthContext";
import { getLimitsForStage } from "@/lib/ckdLimits";
import type { NutrientKey } from "@/components/NutrientProgressBar";
import { useMeals } from "@/lib/useMeals";
import { deleteMeal } from "@/lib/mealsRepo";
import { useTheme } from "@/lib/theme";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import { STATUS } from "@/components/StatusBadge";
import type { StatusLevel } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";

type DayTotals = {
  calories: number;
  potassium: number;
  phosphorus: number;
  sodium: number;
  protein: number;
};

function sumDay(dayMeals: Meal[]): DayTotals {
  return dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.total_calories || 0),
      potassium: acc.potassium + (m.total_potassium || 0),
      phosphorus: acc.phosphorus + (m.total_phosphorus || 0),
      sodium: acc.sodium + (m.total_sodium || 0),
      protein: acc.protein + (m.total_protein || 0),
    }),
    { calories: 0, potassium: 0, phosphorus: 0, sodium: 0, protein: 0 },
  );
}

const nutrientInfo: { key: NutrientKey; limitKey: keyof DayTotals; label: string; unit: string }[] = [
  { key: "potassium", limitKey: "potassium", label: "Potassium", unit: "mg" },
  { key: "phosphorus", limitKey: "phosphorus", label: "Phosphorus", unit: "mg" },
  { key: "sodium", limitKey: "sodium", label: "Sodium", unit: "mg" },
  { key: "protein", limitKey: "protein", label: "Protein", unit: "g" },
];

export default function MealHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { meals, loading, error, refetch } = useMeals();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = useCallback(async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      setExpandedId(null);
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete meal");
    }
  }, [refetch]);

  const ckdStage = user?.ckd_stage ?? null;
  const weightKg = user?.weight_kg ?? null;
  const limits = getLimitsForStage(ckdStage, weightKg);

  const groupedMeals = useMemo(() => {
    const groups: { label: string; meals: Meal[]; totals: DayTotals }[] = [];
    const buckets: Record<string, Meal[]> = {};
    const order: string[] = [];

    meals.forEach((meal) => {
      const d = new Date(meal.logged_at);
      const dateStr = d.toDateString();
      if (!buckets[dateStr]) {
        buckets[dateStr] = [];
        order.push(dateStr);
      }
      buckets[dateStr].push(meal);
    });

    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    order.forEach((dateStr) => {
      const dayMeals = buckets[dateStr];
      let label: string;
      if (dateStr === today) label = "Today";
      else if (dateStr === yesterdayStr) label = "Yesterday";
      else
        label = new Date(dateStr).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

      groups.push({ label, meals: dayMeals, totals: sumDay(dayMeals) });
    });

    return groups;
  }, [meals]);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const initialLoad = loading && meals.length === 0 && !refreshing;

  return (
    <Screen
      header={
        <ScreenHeader
          title="Meal history"
          subtitle={meals.length > 0 ? `${meals.length} meals logged · pull down to refresh` : undefined}
        />
      }
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
      {initialLoad ? (
        <LoadingState label="Loading your meals…" />
      ) : error ? (
        <Card>
          <ErrorState title="Couldn't load your meals" onRetry={refetch} />
        </Card>
      ) : meals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Utensils}
            title="No meals yet"
            message="Every meal you log will appear here, grouped by day, so you can spot patterns."
            action={{
              label: "Log your first meal",
              icon: Camera,
              onPress: () => router.navigate("/(tabs)/scan"),
            }}
          />
        </Card>
      ) : (
        groupedMeals.map(({ label: dateLabel, meals: dayMeals, totals }) => (
          <View key={dateLabel} className="mb-8">
            <Text className="text-title font-bold text-foreground mb-4" accessibilityRole="header">
              {dateLabel}
            </Text>

            {/* Daily nutrient summary */}
            <Card className="mb-4">
              <View className="flex-row items-baseline justify-between mb-4">
                <Text className="text-body font-bold text-foreground">Day total</Text>
                <Text className="text-body text-foreground">
                  <Text className="font-bold">{Math.round(totals.calories)}</Text>
                  <Text className="text-muted-foreground"> / {limits.calories} kcal</Text>
                </Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {nutrientInfo.map(({ key, limitKey, label, unit }) => {
                  const val = totals[limitKey];
                  const lim = limits[key as keyof typeof limits] as number;
                  const ratio = lim > 0 ? val / lim : 0;
                  const pct = Math.min(ratio * 100, 100);
                  const level: StatusLevel = !ckdStage
                    ? "unknown"
                    : ratio > 1
                    ? "danger"
                    : ratio >= 0.8
                    ? "caution"
                    : "safe";
                  const s = STATUS[level];
                  const Icon = s.icon;
                  return (
                    <View
                      key={key}
                      className="w-1/2 px-1 mb-2"
                      accessible
                      accessibilityLabel={`${label}: ${Math.round(val)} of ${lim} ${unit}. ${s.label}`}
                    >
                      <View className="bg-muted rounded-sm p-3">
                        <View className="flex-row items-center">
                          <Icon size={16} color={colors[s.fg]} strokeWidth={2.5} />
                          <Text className="text-caption text-muted-foreground ml-1" numberOfLines={1}>
                            {label}
                          </Text>
                        </View>
                        <Text className="text-body font-bold text-foreground mt-1">
                          {Math.round(val)} {unit}
                        </Text>
                        <View className="h-2 bg-card rounded-full overflow-hidden mt-2">
                          <View
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: colors[s.fg] }}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Meal list */}
            <Card padded={false} className="overflow-hidden">
              {dayMeals.map((meal, idx) => (
                <View
                  key={meal.id}
                  className={idx > 0 ? "border-t border-border" : ""}
                >
                  <MealHistoryItem
                    meal={meal}
                    isExpanded={expandedId === meal.id}
                    onToggle={() => toggle(meal.id)}
                    photoUrl={meal.photo_url}
                    onDelete={() => handleDelete(meal.id)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}
