import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Utensils } from "lucide-react-native";
import MealHistoryItem from "@/components/MealHistoryItem";
import type { Meal } from "@/components/MealCard";
import { useAuth } from "@/lib/AuthContext";
import { getLimitsForStage } from "@/lib/ckdLimits";
import { NUTRIENT_COLORS, type NutrientKey } from "@/components/NutrientProgressBar";
import { useMeals } from "@/lib/useMeals";
import { deleteMeal } from "@/lib/mealsRepo";

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
  { key: "potassium", limitKey: "potassium", label: "K", unit: "mg" },
  { key: "phosphorus", limitKey: "phosphorus", label: "P", unit: "mg" },
  { key: "sodium", limitKey: "sodium", label: "Na", unit: "mg" },
  { key: "protein", limitKey: "protein", label: "Protein", unit: "g" },
];

export default function MealHistory() {
  const { user } = useAuth();
  const { meals, loading, refetch } = useMeals();
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        className="px-4 pt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A7A55" colors={["#1A7A55"]} />
        }
      >
        <View className="flex-row items-center mb-6">
          <Calendar size={20} color="#1A7A55" />
          <Text className="text-lg font-bold text-foreground ml-3">
            Meal History
          </Text>
          {meals.length > 0 ? (
            <View className="ml-auto bg-muted px-2.5 py-1 rounded-full">
              <Text className="text-xs text-muted-foreground font-semibold">
                {meals.length} entries
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row mb-5">
          {[
            { dot: "bg-primary", label: "Safe" },
            { dot: "bg-[#E6A817]", label: "Caution" },
            { dot: "bg-destructive", label: "Danger" },
          ].map(({ dot, label }) => (
            <View key={label} className="flex-row items-center mr-4">
              <View className={`h-2 w-2 rounded-full ${dot}`} />
              <Text className="text-xs text-muted-foreground ml-1.5">
                {label}
              </Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#1A7A55" />
          </View>
        ) : meals.length === 0 ? (
          <View className="items-center py-16">
            <View className="h-20 w-20 bg-muted rounded-full items-center justify-center mb-4">
              <Utensils size={32} color="#9CA3AF" />
            </View>
            <Text className="text-sm text-muted-foreground">
              No meals logged yet
            </Text>
          </View>
        ) : (
          <View>
            {groupedMeals.map(({ label: dateLabel, meals: dayMeals, totals }) => (
              <View key={dateLabel} className="mb-6">
                <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">
                  {dateLabel}
                </Text>

                {/* Daily nutrient summary */}
                <View className="bg-card rounded-2xl border border-border p-3 mb-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-semibold text-foreground">
                      {Math.round(totals.calories)} kcal
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      / {limits.calories} limit
                    </Text>
                  </View>
                  <View className="flex-row -mx-0.5">
                    {nutrientInfo.map(({ key, limitKey, label, unit }) => {
                      const val = totals[limitKey];
                      const lim = limits[key as keyof typeof limits] as number;
                      const pct = lim > 0 ? Math.min((val / lim) * 100, 100) : 0;
                      const over = lim > 0 && val > lim;
                      const color = NUTRIENT_COLORS[key];
                      return (
                        <View key={key} className="flex-1 px-0.5">
                          <View className="items-center">
                            <Text
                              className="text-[10px] font-bold mb-0.5"
                              style={{ color: over ? "#DC2626" : color }}
                            >
                              {label}
                            </Text>
                            <View className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <View
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: over ? "#DC2626" : color,
                                }}
                              />
                            </View>
                            <Text
                              className="text-[9px] mt-0.5"
                              style={{ color: over ? "#DC2626" : "#6B7280" }}
                            >
                              {Math.round(val)}{unit}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Meal list */}
                <View className="bg-card rounded-2xl border border-border overflow-hidden">
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
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
