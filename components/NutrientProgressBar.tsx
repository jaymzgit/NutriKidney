import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { tokens, useTheme } from "@/lib/theme";
import { STATUS } from "./StatusBadge";
import type { StatusLevel } from "./StatusBadge";

export type NutrientKey = "potassium" | "phosphorus" | "sodium" | "protein";

/** Kept for API compatibility. The bar itself is coloured by status, not nutrient. */
export const NUTRIENT_COLORS: Record<NutrientKey, string> = {
  potassium: tokens.fixed.detection[4],
  phosphorus: tokens.fixed.detection[1],
  sodium: tokens.fixed.detection[2],
  protein: tokens.fixed.detection[6],
};

const SHORT: Record<NutrientKey, string> = {
  potassium: "K",
  phosphorus: "P",
  sodium: "Na",
  protein: "Pro",
};

export default function NutrientProgressBar({
  label,
  nutrientKey,
  current,
  limit,
  unit,
  isUnknown,
}: {
  label: string;
  nutrientKey: NutrientKey;
  current: number;
  limit: number;
  unit: string;
  isUnknown?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const ratio = limit > 0 ? current / limit : 0;
  const pct = Math.min(ratio * 100, 100);

  const level: StatusLevel = isUnknown
    ? "unknown"
    : ratio > 1
    ? "danger"
    : ratio >= 0.8
    ? "caution"
    : "safe";
  const s = STATUS[level];
  const Icon = s.icon;
  const statusText = isUnknown
    ? "No limit set"
    : level === "danger"
    ? `Over by ${Math.round(current - limit)} ${unit}`
    : level === "caution"
    ? "Close to limit"
    : "Within limit";

  const width = useRef(new Animated.Value(reduceMotion ? pct : 0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: reduceMotion ? 0 : 600,
      useNativeDriver: false,
    }).start();
  }, [pct, reduceMotion, width]);

  const valueText = isUnknown
    ? `${Math.round(current)} ${unit}`
    : `${Math.round(current)} / ${limit} ${unit}`;

  return (
    <View
      className="mb-5"
      accessible
      accessibilityLabel={`${label}: ${valueText}. ${statusText}.`}
    >
      <View className="flex-row items-baseline justify-between mb-2">
        <Text className="text-body font-bold text-foreground">
          {label}{" "}
          <Text className="text-caption font-normal text-muted-foreground">
            ({SHORT[nutrientKey]})
          </Text>
        </Text>
        <Text className="text-body text-foreground">{valueText}</Text>
      </View>
      <View className="h-2 bg-muted rounded-full overflow-hidden">
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 999,
            backgroundColor: colors[s.fg],
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
      <View className="flex-row items-center mt-2">
        <Icon size={16} color={colors[s.fg]} strokeWidth={2.5} />
        <Text className={`text-caption font-bold ml-1 ${s.textClass}`}>
          {statusText}
        </Text>
      </View>
    </View>
  );
}
