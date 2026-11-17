import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

type Props = TextInputProps & {
  label?: string;
  icon?: LucideIcon;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
  /** Helper text under the field. */
  hint?: string;
  /** Error text under the field (replaces hint, turns the border red). */
  error?: string;
};

export default function TextField({
  label,
  icon: Icon,
  rightSlot,
  containerClassName = "",
  hint,
  error,
  secureTextEntry,
  multiline,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  const borderClass = error
    ? "border-danger"
    : focused
    ? "border-primary"
    : "border-input";

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label ? (
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-caption font-bold text-foreground">{label}</Text>
          {rightSlot}
        </View>
      ) : null}
      <View
        className={`flex-row rounded-sm bg-card border ${borderClass} ${
          multiline ? "items-start" : "items-center"
        }`}
      >
        {Icon ? (
          <View className={`pl-4 ${multiline ? "pt-4" : ""}`}>
            <Icon size={20} color={colors.mutedForeground} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          secureTextEntry={isPassword && !revealed}
          multiline={multiline}
          className={`flex-1 min-h-[52px] px-4 text-body text-foreground ${
            multiline ? "py-4" : ""
          }`}
          style={multiline ? { textAlignVertical: "top" } : undefined}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            className="min-h-touch min-w-touch items-center justify-center mr-1"
          >
            {revealed ? (
              <EyeOff size={20} color={colors.mutedForeground} />
            ) : (
              <Eye size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          className="text-caption text-danger mt-2"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-caption text-muted-foreground mt-2">{hint}</Text>
      ) : null}
    </View>
  );
}
