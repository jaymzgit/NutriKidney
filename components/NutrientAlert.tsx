import { Text, View } from "react-native";
import { AlertOctagon, Lightbulb } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

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
  const { colors, shadow } = useTheme();
  const excess = Math.round(alert.total - alert.limit);
  const suggestion = swapSuggestions[alert.key];

  return (
    <View
      className="bg-card border border-danger/40 rounded-md mb-4 overflow-hidden"
      style={shadow}
    >
      <View className="bg-danger-soft px-5 py-4 flex-row items-center">
        <AlertOctagon size={24} color={colors.danger} strokeWidth={2.25} />
        <Text
          className="flex-1 ml-3 text-title font-bold text-danger"
          accessibilityRole="header"
        >
          {alert.label} too high
        </Text>
      </View>

      <View className="p-5">
        <Text className="text-caption text-muted-foreground">Over your daily limit by</Text>
        <Text className="text-display font-bold text-foreground">
          {excess}
          <Text className="text-body font-normal text-muted-foreground"> {alert.unit}</Text>
        </Text>
        <Text className="text-body text-muted-foreground mt-1">
          {Math.round(alert.total)} of {alert.limit} {alert.unit} eaten today
        </Text>

        {alert.topItem ? (
          <Text className="text-body text-foreground mt-4">
            Biggest source today:{" "}
            <Text className="font-bold">{alert.topItem}</Text>
          </Text>
        ) : null}

        <View className="flex-row bg-muted rounded-sm p-4 mt-4">
          <Lightbulb size={20} color={colors.caution} strokeWidth={2.25} />
          <View className="flex-1 ml-3">
            <Text className="text-caption font-bold text-foreground mb-1">
              Try this instead
            </Text>
            <Text className="text-body text-foreground">{suggestion}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
