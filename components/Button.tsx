import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive-outline";

type Props = Omit<PressableProps, "children" | "style"> & {
  variant?: Variant;
  size?: "md" | "sm";
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

const variants: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-primary", text: "text-primary-foreground" },
  secondary: { container: "bg-primary-soft", text: "text-primary" },
  outline: { container: "bg-card border border-border", text: "text-foreground" },
  ghost: { container: "bg-transparent", text: "text-primary" },
  "destructive-outline": {
    container: "bg-card border border-danger/40",
    text: "text-danger",
  },
};

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon: Icon,
  className = "",
  textClassName = "",
  children,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const v = variants[variant];
  const iconColor = {
    primary: colors.primaryForeground,
    secondary: colors.primary,
    outline: colors.foreground,
    ghost: colors.primary,
    "destructive-outline": colors.danger,
  }[variant];
  const height = size === "sm" ? "min-h-touch px-4" : "min-h-[52px] px-6";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      className={`${height} rounded-md flex-row items-center justify-center active:opacity-80 ${
        v.container
      } ${disabled || loading ? "opacity-50" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : typeof children === "string" ? (
        <View className="flex-row items-center justify-center">
          {Icon ? <Icon size={20} color={iconColor} strokeWidth={2.25} /> : null}
          <Text
            className={`text-body font-bold ${Icon ? "ml-2" : ""} ${v.text} ${textClassName}`}
          >
            {children}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center justify-center">{children}</View>
      )}
    </Pressable>
  );
}
