import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

/** Full-width tappable navigation row with icon, title, subtitle and chevron. */
export default function ListRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
  className?: string;
}) {
  const { colors, shadow } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      className={`flex-row items-center bg-card rounded-md border border-border p-4 active:opacity-80 ${className}`}
      style={shadow}
    >
      <View className="h-12 w-12 rounded-sm bg-primary-soft items-center justify-center">
        <Icon size={20} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-body font-bold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="text-caption text-muted-foreground mt-1">{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}
