import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import type { Palette } from "@/lib/theme";

type Tone = "info" | "caution" | "danger" | "success";

const TONES: Record<Tone, { icon: LucideIcon; fg: keyof Palette; box: string; text: string }> = {
  info: { icon: Info, fg: "info", box: "bg-info-soft border-info/30", text: "text-info" },
  caution: { icon: AlertTriangle, fg: "caution", box: "bg-caution-soft border-caution/30", text: "text-caution" },
  danger: { icon: AlertOctagon, fg: "danger", box: "bg-danger-soft border-danger/30", text: "text-danger" },
  success: { icon: CheckCircle2, fg: "primary", box: "bg-primary-soft border-primary/30", text: "text-primary" },
};

/** Inline message. Pass `onPress` to make the whole banner a link. */
export default function Banner({
  tone,
  title,
  message,
  icon,
  onPress,
  accessory,
  className = "mb-4",
}: {
  tone: Tone;
  title?: string;
  message?: React.ReactNode;
  icon?: LucideIcon;
  onPress?: () => void;
  accessory?: React.ReactNode;
  className?: string;
}) {
  const { colors } = useTheme();
  const t = TONES[tone];
  const Icon = icon ?? t.icon;

  const body = (
    <>
      <Icon size={20} color={colors[t.fg]} strokeWidth={2.25} />
      <View className="flex-1 ml-3">
        {title ? (
          <Text className={`text-body font-bold ${t.text}`}>{title}</Text>
        ) : null}
        {message ? (
          <Text className={`text-caption text-foreground ${title ? "mt-1" : ""}`}>
            {message}
          </Text>
        ) : null}
      </View>
      {accessory}
      {onPress ? <ChevronRight size={20} color={colors[t.fg]} /> : null}
    </>
  );

  const cls = `flex-row items-center rounded-md border p-4 ${t.box} ${className}`;

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className={`${cls} active:opacity-80`}
    >
      {body}
    </Pressable>
  ) : (
    <View
      className={cls}
      accessibilityLiveRegion={tone === "danger" ? "polite" : "none"}
    >
      {body}
    </View>
  );
}
