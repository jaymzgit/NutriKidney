import { Text, View } from "react-native";
import { Camera, Pencil } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

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

const methodIcons: Record<string, LucideIcon> = {
  scan: Camera,
  text: Pencil,
  manual: Pencil,
};

const riskStyles: Record<string, { badgeBg: string; badgeText: string }> = {
  safe: { badgeBg: "bg-primary/10", badgeText: "text-primary" },
  caution: { badgeBg: "bg-[#E6A817]/10", badgeText: "text-[#E6A817]" },
  danger: { badgeBg: "bg-destructive/10", badgeText: "text-destructive" },
};

export default function MealCard({ meal }: { meal: Meal }) {
  const Icon = methodIcons[meal.method || ""] || Pencil;
  const risk = riskStyles[meal.risk_level || ""] || riskStyles.safe;

  const mealTime = new Date(meal.logged_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const totalCal =
    meal.meal_items?.reduce((acc, it) => acc + Number(it.calories || 0), 0) ||
    meal.total_calories ||
    0;

  const itemsText =
    meal.meal_items
      ?.map((i) => `${i.food_name} (${Math.round(i.portion_g || 0)}g)`)
      .join(", ") || "No items recorded";

  return (
    <View className="bg-muted/40 rounded-xl p-3.5 mb-2.5 border border-border/50">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Icon size={16} color="#6B7280" />
          <Text className="text-sm font-semibold text-foreground ml-2">
            {mealTime}
          </Text>
        </View>
        {meal.risk_level ? (
          <View className={`px-2.5 py-1 rounded-full ${risk.badgeBg}`}>
            <Text className={`text-xs font-bold ${risk.badgeText}`}>
              {meal.risk_level.charAt(0).toUpperCase() + meal.risk_level.slice(1)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-xs text-muted-foreground leading-relaxed mb-2">
        {itemsText}
      </Text>
      <View className="flex-row justify-end">
        <Text className="text-xs font-bold text-foreground">
          {Math.round(totalCal)} kcal
        </Text>
      </View>
    </View>
  );
}
