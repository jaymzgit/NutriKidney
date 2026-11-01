import React from "react";
import { Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import IconButton from "./IconButton";

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Go back",
  backIcon = ChevronLeft,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: LucideIcon;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center pt-4 pb-4">
      {onBack ? (
        <IconButton
          icon={backIcon}
          accessibilityLabel={backLabel}
          onPress={onBack}
          className="-ml-2 mr-2"
        />
      ) : null}
      <View className="flex-1">
        <Text className="text-display font-bold text-foreground" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-caption text-muted-foreground mt-1">{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View className="ml-2 flex-row items-center">{right}</View> : null}
    </View>
  );
}
