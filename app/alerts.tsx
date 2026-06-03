import { ScrollView, Text, View } from "react-native";
import NutrientAlert from "@/components/NutrientAlert";
import { useNutrientAlerts } from "@/lib/useNutrientAlerts";

export default function AlertsScreen() {
  const { nutrientAlerts } = useNutrientAlerts();

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {nutrientAlerts.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-sm text-muted-foreground">
              No nutrient limits exceeded today.
            </Text>
          </View>
        ) : (
          nutrientAlerts.map((alert) => (
            <NutrientAlert key={alert.key} alert={alert} />
          ))
        )}
      </ScrollView>
    </View>
  );
}
