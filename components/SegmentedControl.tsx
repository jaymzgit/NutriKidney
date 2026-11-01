import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const { colors, shadow } = useTheme();
  return (
    <View
      className={`flex-row bg-muted rounded-md p-1 ${className}`}
      accessibilityRole="tablist"
    >
      {options.map(({ value: v, label, icon: Icon }) => {
        const selected = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 min-h-touch flex-row items-center justify-center rounded-sm px-2 ${
              selected ? "bg-card" : ""
            }`}
            style={selected ? shadow : undefined}
          >
            {Icon ? (
              <Icon
                size={20}
                color={selected ? colors.primary : colors.mutedForeground}
                strokeWidth={2.25}
              />
            ) : null}
            <Text
              numberOfLines={1}
              className={`text-body ${Icon ? "ml-2" : ""} ${
                selected ? "text-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
