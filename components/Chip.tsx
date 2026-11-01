import { Pressable, Text } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

/**
 * Selectable option. Selection is shown by a check mark and border, not colour
 * alone. Use role "radio" for pick-one groups, "checkbox" for toggles.
 */
export default function Chip({
  label,
  selected,
  onPress,
  role = "radio",
  className = "",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: "radio" | "checkbox";
  className?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      className={`min-h-touch px-4 rounded-sm border flex-row items-center justify-center mr-2 mb-2 active:opacity-80 ${
        selected ? "border-primary bg-primary-soft" : "border-border bg-card"
      } ${className}`}
    >
      {selected ? (
        <Check size={16} color={colors.primary} strokeWidth={3} style={{ marginRight: 6 }} />
      ) : null}
      <Text
        className={`text-body ${
          selected ? "text-primary font-bold" : "text-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
