import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Utensils } from "lucide-react-native";
import MealHistoryItem from "@/components/MealHistoryItem";
import type { Meal } from "@/components/MealCard";

const meals: Meal[] = []; // TODO: wire to FastAPI /logs

export default function MealHistory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedMeals = useMemo(() => {
    const groups: Record<string, Meal[]> = {};
    meals.forEach((meal) => {
      const d = new Date(meal.logged_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateKey: string;
      if (d.toDateString() === today.toDateString()) dateKey = "Today";
      else if (d.toDateString() === yesterday.toDateString())
        dateKey = "Yesterday";
      else
        dateKey = d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meal);
    });
    return groups;
  }, []);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 pt-2">
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

        {meals.length === 0 ? (
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
            {Object.entries(groupedMeals).map(([dateLabel, dayMeals]) => (
              <View key={dateLabel} className="mb-6">
                <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">
                  {dateLabel}
                </Text>
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
