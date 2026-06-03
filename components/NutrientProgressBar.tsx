import { Text, View } from "react-native";

export type NutrientKey = "potassium" | "phosphorus" | "sodium" | "protein";

export const NUTRIENT_COLORS: Record<NutrientKey, string> = {
  potassium: "#7C3AED",
  phosphorus: "#F59E0B",
  sodium: "#2563EB",
  protein: "#16A34A",
};

export default function NutrientProgressBar({
  label,
  nutrientKey,
  current,
  limit,
  unit,
  isUnknown,
}: {
  label: string;
  nutrientKey: NutrientKey;
  current: number;
  limit: number;
  unit: string;
  isUnknown?: boolean;
}) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const color = NUTRIENT_COLORS[nutrientKey];
  const over = !isUnknown && limit > 0 && current > limit;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center">
          <View
            className="h-2 w-2 rounded-full mr-2"
            style={{ backgroundColor: isUnknown ? "#9CA3AF" : color }}
          />
          <Text
            className="text-xs font-semibold uppercase"
            style={{ color: isUnknown ? "#6B7280" : color }}
          >
            {label}
          </Text>
        </View>
        <Text
          className={`text-xs ${over ? "font-semibold" : ""}`}
          style={{ color: over ? "#DC2626" : "#6B7280" }}
        >
          {isUnknown
            ? `${Math.round(current)} ${unit}`
            : `${Math.round(current)} / ${limit} ${unit}`}
        </Text>
      </View>
      <View className="h-1.5 bg-muted rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: isUnknown ? "#9CA3AF" : color,
          }}
        />
      </View>
    </View>
  );
}
