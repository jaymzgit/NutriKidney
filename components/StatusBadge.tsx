import { Text, View } from "react-native";
import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import type { Palette } from "@/lib/theme";

export type StatusLevel = "safe" | "caution" | "danger" | "unknown";

/** Shared status vocabulary — icon + word + colour, never colour alone. */
export const STATUS: Record<
  StatusLevel,
  { label: string; icon: LucideIcon; fg: keyof Palette; bgClass: string; textClass: string }
> = {
  safe: { label: "Safe", icon: CheckCircle2, fg: "primary", bgClass: "bg-primary-soft", textClass: "text-primary" },
  caution: { label: "Caution", icon: AlertTriangle, fg: "caution", bgClass: "bg-caution-soft", textClass: "text-caution" },
  danger: { label: "Danger", icon: AlertOctagon, fg: "danger", bgClass: "bg-danger-soft", textClass: "text-danger" },
  unknown: { label: "Unknown", icon: HelpCircle, fg: "mutedForeground", bgClass: "bg-muted", textClass: "text-muted-foreground" },
};

export function toStatus(level: string | null | undefined): StatusLevel {
  return level === "safe" || level === "caution" || level === "danger" ? level : "unknown";
}

export default function StatusBadge({
  level,
  label,
  className = "",
}: {
  level: StatusLevel;
  label?: string;
  className?: string;
}) {
  const { colors } = useTheme();
  const s = STATUS[level];
  const Icon = s.icon;
  const text = label ?? s.label;
  return (
    <View
      className={`flex-row items-center self-start rounded-full px-3 py-1 ${s.bgClass} ${className}`}
      accessible
      accessibilityLabel={`Status: ${text}`}
    >
      <Icon size={16} color={colors[s.fg]} strokeWidth={2.5} />
      <Text className={`text-caption font-bold ml-1 ${s.textClass}`}>{text}</Text>
    </View>
  );
}
