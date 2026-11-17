import { Alert, Image, Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Trash2, Utensils } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import type { Meal } from "./MealCard";
import { METHOD_META, formatMealTime } from "./MealCard";
import StatusBadge from "./StatusBadge";
import Button from "./Button";

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
  const { colors } = useTheme();
  const method = METHOD_META[meal.method || ""] || METHOD_META.manual;
  const mealTime = formatMealTime(meal.logged_at);

  const itemNames =
    meal.meal_items?.map((i) => i.food_name).join(", ") || "Meal";
  const totalCal =
    meal.total_calories ||
    meal.meal_items?.reduce((a, i) => a + (i.calories || 0), 0) ||
    0;

  const photo = photoUrl || meal.photo_url;

  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${itemNames}, ${mealTime}, ${Math.round(totalCal)} calories`}
        accessibilityHint={isExpanded ? "Hides meal details" : "Shows meal details"}
        className="flex-row items-center px-4 py-4 active:bg-muted"
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: 48, height: 48, borderRadius: 12 }}
          />
        ) : (
          <View className="h-12 w-12 rounded-sm bg-muted items-center justify-center">
            <Utensils size={20} color={colors.mutedForeground} />
          </View>
        )}
        <View className="flex-1 min-w-0 ml-4">
          <Text className="text-body font-bold text-foreground" numberOfLines={2}>
            {itemNames}
          </Text>
          <Text className="text-caption text-muted-foreground mt-1">
            {mealTime} · {Math.round(totalCal)} kcal
          </Text>
          {meal.risk_level ? (
            <StatusBadge level={meal.risk_level} className="mt-2" />
          ) : null}
        </View>
        <View className="ml-2">
          {isExpanded ? (
            <ChevronUp size={20} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={20} color={colors.mutedForeground} />
          )}
        </View>
      </Pressable>

      {isExpanded ? (
        <View className="px-4 pb-4 pt-2 border-t border-border">
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 8, marginBottom: 8 }}
              resizeMode="cover"
              accessibilityLabel="Meal photo"
            />
          ) : null}

          <Text className="text-caption text-muted-foreground mt-2">
            Logged by {method.label.toLowerCase()}
          </Text>

          {meal.meal_items && meal.meal_items.length > 0 ? (
            <View className="mt-4">
              <Text className="text-body font-bold text-foreground mb-2">Foods</Text>
              {meal.meal_items.map((item, i) => (
                <View
                  key={i}
                  className="flex-row items-center justify-between py-2 border-b border-border"
                >
                  <Text className="text-body text-foreground flex-1 mr-2">
                    {item.food_name}
                  </Text>
                  <Text className="text-caption text-muted-foreground">
                    {Math.round(item.portion_g || 0)}g · {Math.round(item.calories || 0)} kcal
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text className="text-body font-bold text-foreground mt-4 mb-2">Nutrients</Text>
          <View className="flex-row flex-wrap -mx-1">
            {nutrientRows.map(({ key, label, unit }) => {
              const total = meal[`total_${key}` as const];
              const val =
                total ??
                meal.meal_items?.reduce((a, i) => a + ((i as any)[key] || 0), 0) ??
                0;
              return (
                <View key={key} className="w-1/2 px-1 mb-2">
                  <View className="bg-muted rounded-sm px-4 py-3">
                    <Text className="text-caption text-muted-foreground">{label}</Text>
                    <Text className="text-body font-bold text-foreground">
                      {Math.round(val)} {unit}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {meal.notes ? (
            <Text className="mt-2 text-body text-muted-foreground">{meal.notes}</Text>
          ) : null}

          {onDelete ? (
            <Button
              variant="destructive-outline"
              size="sm"
              icon={Trash2}
              className="mt-4"
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
            >
              Delete this meal
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
