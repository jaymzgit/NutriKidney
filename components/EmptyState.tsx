import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import Button from "./Button";

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  tone?: "primary" | "danger";
}) {
  const { colors } = useTheme();
  return (
    <View className="items-center py-8 px-4">
      <View
        className={`h-16 w-16 rounded-full items-center justify-center mb-4 ${
          tone === "danger" ? "bg-danger-soft" : "bg-primary-soft"
        }`}
      >
        <Icon
          size={28}
          color={tone === "danger" ? colors.danger : colors.primary}
          strokeWidth={2}
        />
      </View>
      <Text className="text-title font-bold text-foreground text-center">{title}</Text>
      {message ? (
        <Text className="text-body text-muted-foreground text-center mt-2">
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button icon={action.icon} onPress={action.onPress} className="mt-6 self-stretch">
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}
