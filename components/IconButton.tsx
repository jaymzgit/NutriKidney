import { Pressable } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

type Tone = "default" | "primary" | "danger";

/** Icon-only button. `accessibilityLabel` is required — there is no visible text. */
export default function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  tone = "default",
  soft = false,
  disabled,
  className = "",
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: Tone;
  /** Filled tinted background instead of transparent. */
  soft?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { colors } = useTheme();
  const color = {
    default: colors.foreground,
    primary: colors.primary,
    danger: colors.danger,
  }[tone];
  const bg = !soft
    ? ""
    : { default: "bg-muted", primary: "bg-primary-soft", danger: "bg-danger-soft" }[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      className={`h-12 w-12 rounded-full items-center justify-center active:opacity-70 ${bg} ${
        disabled ? "opacity-40" : ""
      } ${className}`}
    >
      <Icon size={20} color={color} strokeWidth={2.25} />
    </Pressable>
  );
}
