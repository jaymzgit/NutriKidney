import React from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "@/lib/theme";

export default function Card({
  children,
  className = "",
  style,
  padded = true,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { shadow } = useTheme();
  const content = (
    <View
      className={`bg-card rounded-md border border-border ${padded ? "p-5" : ""} ${className}`}
      style={[shadow, style]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className="active:opacity-80"
    >
      {content}
    </Pressable>
  );
}
