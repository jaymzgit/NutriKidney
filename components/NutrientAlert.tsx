import { Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

export type NutrientAlertData = {
  key: "potassium" | "phosphorus" | "sodium" | "protein";
  label: string;
  unit: string;
  total: number;
  limit: number;
  topItem?: string | null;
  topVal?: number;
};

const swapSuggestions: Record<string, string> = {
  potassium:
    "Try leached vegetables (boiled & drained), white rice, or apple slices instead of high-potassium foods.",
  phosphorus:
    "Choose egg whites, plain pasta, or rice cakes instead of dairy, nuts, or whole grains.",
  sodium:
    "Use herbs and lemon juice for flavour instead of salt or processed seasonings.",
  protein:
    "Reduce portion size or swap one serving for a low-protein starch like white bread or tapioca.",
};

export default function NutrientAlert({ alert }: { alert: NutrientAlertData }) {
  const excess = Math.round(alert.total - alert.limit);
  const suggestion = swapSuggestions[alert.key];

  return (
    <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-2">
      <View className="flex-row items-start">
        <View className="h-8 w-8 bg-red-100 rounded-xl items-center justify-center">
          <AlertTriangle size={16} color="#DC2626" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-sm font-bold text-red-700">
            {alert.label} limit exceeded
          </Text>
          <Text className="text-xs text-red-600 mt-0.5">
            +{excess} {alert.unit} over your daily limit
            {alert.topItem ? (
              <Text>
                {" — highest source: "}
                <Text className="font-semibold">{alert.topItem}</Text>
              </Text>
            ) : null}
          </Text>
          <Text className="text-xs text-red-500 mt-2 leading-relaxed">
            💡 {suggestion}
          </Text>
        </View>
      </View>
    </View>
  );
}
