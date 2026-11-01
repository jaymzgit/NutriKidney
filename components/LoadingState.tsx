import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      className="items-center justify-center py-16"
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="text-body text-muted-foreground mt-4">{label}</Text>
    </View>
  );
}
