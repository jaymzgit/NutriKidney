import { Text, View } from "react-native";
import { Camera, Search } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import StatusBadge from "./StatusBadge";

type MealItem = {
  food_name: string;
  portion_g?: number;
  calories?: number;
  potassium?: number;
  phosphorus?: number;
  sodium?: number;
  protein?: number;
};

export type Meal = {
  id: string;
  logged_at: string;
  method?: "scan" | "text" | "manual";
  risk_level?: "safe" | "caution" | "danger";
  total_calories?: number;
  total_potassium?: number;
  total_phosphorus?: number;
  total_sodium?: number;
  total_protein?: number;
  meal_items?: MealItem[];
  notes?: string;
  photo_url?: string;
};

export const METHOD_META: Record<string, { icon: LucideIcon; label: string }> = {
  scan: { icon: Camera, label: "Photo scan" },
  text: { icon: Search, label: "Typed" },
  manual: { icon: Search, label: "Searched" },
};

export function formatMealTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MealCard({ meal }: { meal: Meal }) {
  const { colors } = useTheme();
  const method = METHOD_META[meal.method || ""] || METHOD_META.manual;
  const Icon = method.icon;

  const totalCal =
    meal.meal_items?.reduce((acc, it) => acc + Number(it.calories || 0), 0) ||
    meal.total_calories ||
    0;

  const itemsText =
    meal.meal_items
      ?.map((i) => `${i.food_name} (${Math.round(i.portion_g || 0)}g)`)
      .join(", ") || "No items recorded";

  return (
    <View className="bg-muted rounded-sm p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <Icon size={20} color={colors.mutedForeground} />
          <Text className="text-body font-bold text-foreground ml-2">
            {formatMealTime(meal.logged_at)}
          </Text>
        </View>
        {meal.risk_level ? <StatusBadge level={meal.risk_level} /> : null}
      </View>
      <Text className="text-body text-foreground">{itemsText}</Text>
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-caption text-muted-foreground">{method.label}</Text>
        <Text className="text-body font-bold text-foreground">
          {Math.round(totalCal)} kcal
        </Text>
      </View>
    </View>
  );
}
