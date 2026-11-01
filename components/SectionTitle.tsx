import React from "react";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

export default function SectionTitle({
  icon: Icon,
  title,
  action,
  className = "mb-4",
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const { colors } = useTheme();
  return (
    <View className={`flex-row items-center ${className}`}>
      {Icon ? <Icon size={20} color={colors.primary} strokeWidth={2.25} /> : null}
      <Text
        className={`flex-1 text-body font-bold text-foreground ${Icon ? "ml-2" : ""}`}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
