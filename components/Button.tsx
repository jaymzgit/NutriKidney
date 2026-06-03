import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PressableProps } from "react-native";

type Variant = "primary" | "outline" | "ghost" | "destructive-outline";

type Props = Omit<PressableProps, "children" | "style"> & {
  variant?: Variant;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

const base =
  "h-12 px-4 rounded-xl flex-row items-center justify-center active:opacity-80";

const variants: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-primary",
    text: "text-primary-foreground font-semibold",
  },
  outline: {
    container: "bg-card border border-border",
    text: "text-foreground font-medium",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-primary font-medium",
  },
  "destructive-outline": {
    container: "bg-card border border-destructive/30",
    text: "text-destructive font-semibold",
  },
};

export default function Button({
  variant = "primary",
  loading,
  disabled,
  className = "",
  textClassName = "",
  children,
  ...rest
}: Props) {
  const v = variants[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      className={`${base} ${v.container} ${
        disabled || loading ? "opacity-50" : ""
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#FFFFFF" : "#1A7A55"}
        />
      ) : typeof children === "string" ? (
        <Text className={`text-sm ${v.text} ${textClassName}`}>{children}</Text>
      ) : (
        <View className="flex-row items-center justify-center">{children}</View>
      )}
    </Pressable>
  );
}
