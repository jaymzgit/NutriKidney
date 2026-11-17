import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, Heart, Home } from "lucide-react-native";
import NutrientAlert from "@/components/NutrientAlert";
import EmptyState from "@/components/EmptyState";
import { useNutrientAlerts } from "@/lib/useNutrientAlerts";

export default function AlertsScreen() {
  const { nutrientAlerts, ckdStage } = useNutrientAlerts();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-[600px] self-center">
          {!ckdStage ? (
            <EmptyState
              icon={Heart}
              title="Set your CKD stage first"
              message="Alerts compare what you eat with limits for your kidney stage."
              action={{
                label: "Go to Profile",
                onPress: () => router.navigate("/(tabs)/profile"),
              }}
            />
          ) : nutrientAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All within your limits"
              message="No nutrient limits exceeded today. Keep it up!"
              action={{ label: "Back to Home", icon: Home, onPress: () => router.back() }}
            />
          ) : (
            <>
              <Text className="text-body text-muted-foreground mb-4">
                You've gone over {nutrientAlerts.length === 1 ? "one limit" : `${nutrientAlerts.length} limits`}{" "}
                today. Try to eat lighter for the rest of the day, and see the swaps below.
              </Text>
              {nutrientAlerts.map((alert) => (
                <NutrientAlert key={alert.key} alert={alert} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
