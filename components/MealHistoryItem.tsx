import { Image, Pressable, Text, View } from "react-native";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Mic,
  Pencil,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Meal } from "./MealCard";

const methodIcons: Record<string, LucideIcon> = {
  scan: Camera,
  voice: Mic,
  manual: Pencil,
};

const riskDot: Record<string, string> = {
  safe: "bg-primary",
  caution: "bg-[#E6A817]",
  danger: "bg-destructive",
};

const nutrientRows: { key: "potassium" | "phosphorus" | "sodium" | "protein"; label: string; unit: string }[] = [
  { key: "potassium", label: "Potassium", unit: "mg" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "protein", label: "Protein", unit: "g" },
];

export default function MealHistoryItem({
  meal,
  isExpanded,
  onToggle,
}: {
  meal: Meal;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = methodIcons[meal.method || ""] || Pencil;
  const dot = riskDot[meal.risk_level || ""] || "bg-primary";

  const mealTime = new Date(meal.logged_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const itemNames =
    meal.meal_items?.map((i) => i.food_name).join(", ") || "Meal";
  const totalCal =
    meal.total_calories ||
    meal.meal_items?.reduce((a, i) => a + (i.calories || 0), 0) ||
    0;

  return (
    <View>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center gap-3 px-4 py-3.5 active:bg-muted/40"
      >
        <View className={`h-2 w-2 rounded-full ${dot}`} />
        <View className="ml-2">
          <Icon size={16} color="#6B7280" />
        </View>
        <View className="flex-1 min-w-0 ml-2">
          <Text
            className="text-sm font-semibold text-foreground"
            numberOfLines={1}
          >
            {itemNames}
          </Text>
          <Text className="text-xs text-muted-foreground">{mealTime}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-foreground mr-1">
            {Math.round(totalCal)} kcal
          </Text>
          {isExpanded ? (
            <ChevronUp size={16} color="#6B7280" />
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </View>
      </Pressable>

      {isExpanded ? (
        <View className="px-4 pb-4 border-t border-border bg-muted/20">
          {meal.photo_url ? (
            <Image
              source={{ uri: meal.photo_url }}
              className="w-full h-48 rounded-xl mt-4 mb-4"
              resizeMode="cover"
            />
          ) : null}

          {meal.meal_items && meal.meal_items.length > 0 ? (
            <View className="mt-4 mb-4">
              <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Items
              </Text>
              <View>
                {meal.meal_items.map((item, i) => (
                  <View
                    key={i}
                    className="flex-row items-center justify-between mb-1.5"
                  >
                    <Text className="text-sm text-foreground">
                      {item.food_name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {Math.round(item.portion_g || 0)}g ·{" "}
                      {Math.round(item.calories || 0)} kcal
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Nutrients
            </Text>
            <View className="flex-row flex-wrap -mx-1">
              {nutrientRows.map(({ key, label, unit }) => {
                const total = meal[`total_${key}` as const];
                const val =
                  total ??
                  meal.meal_items?.reduce(
                    (a, i) => a + ((i as any)[key] || 0),
                    0
                  ) ??
                  0;
                return (
                  <View key={key} className="w-1/2 px-1 mb-2">
                    <View className="bg-card rounded-lg px-3 py-2 border border-border">
                      <Text className="text-xs text-muted-foreground">
                        {label}
                      </Text>
                      <Text className="text-sm font-bold text-foreground">
                        {Math.round(val)} {unit}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {meal.notes ? (
            <Text className="mt-3 text-xs text-muted-foreground italic">
              {meal.notes}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
