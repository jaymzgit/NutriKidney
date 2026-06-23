import { Alert, Image, Pressable, Text, View } from "react-native";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Meal } from "./MealCard";

const methodIcons: Record<string, LucideIcon> = {
  scan: Camera,
  text: Pencil,
  manual: Pencil,
};

const riskDot: Record<string, string> = {
  safe: "bg-primary",
  caution: "bg-[#E6A817]",
  danger: "bg-destructive",
};

const riskBadge: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-primary/10", text: "text-primary", label: "Safe" },
  caution: { bg: "bg-[#E6A817]/15", text: "text-[#E6A817]", label: "Caution" },
  danger: { bg: "bg-destructive/10", text: "text-destructive", label: "Danger" },
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
  photoUrl,
  onDelete,
}: {
  meal: Meal;
  isExpanded: boolean;
  onToggle: () => void;
  photoUrl?: string;
  onDelete?: () => void;
}) {
  const Icon = methodIcons[meal.method || ""] || Pencil;
  const dot = riskDot[meal.risk_level || ""] || "bg-primary";
  const badge = meal.risk_level ? riskBadge[meal.risk_level] : null;

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
          {badge ? (
            <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
              <Text className={`text-[10px] font-bold ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          ) : null}
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: 32, height: 32, borderRadius: 6 }}
            />
          ) : (
            <View
              style={{ width: 32, height: 32, borderRadius: 6 }}
              className="bg-muted items-center justify-center"
            >
              <Utensils size={14} color="#9CA3AF" />
            </View>
          )}
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
          {(photoUrl || meal.photo_url) ? (
            <Image
              source={{ uri: (photoUrl || meal.photo_url)! }}
              style={{ width: "100%", height: 192, borderRadius: 12, marginTop: 16, marginBottom: 16 }}
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

          {onDelete ? (
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Delete Meal",
                  "Remove this meal log? This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: onDelete },
                  ]
                )
              }
              className="flex-row items-center justify-center mt-4 py-2.5 rounded-xl border border-destructive/40 active:bg-destructive/10"
            >
              <Trash2 size={14} color="#DC2626" />
              <Text className="text-xs font-semibold text-destructive ml-2">
                Delete Meal
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
