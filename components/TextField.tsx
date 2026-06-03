import React from "react";
import { Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";

type Props = TextInputProps & {
  label?: string;
  icon?: LucideIcon;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
};

export default function TextField({
  label,
  icon: Icon,
  rightSlot,
  containerClassName = "",
  ...rest
}: Props) {
  return (
    <View className={`mb-3 ${containerClassName}`}>
      {label ? (
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-medium text-foreground">{label}</Text>
          {rightSlot}
        </View>
      ) : null}
      <View className="relative justify-center">
        {Icon ? (
          <View className="absolute left-3 z-10">
            <Icon size={16} color="#6B7280" />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={`h-12 ${
            Icon ? "pl-10" : "pl-3"
          } pr-3 rounded-xl bg-card border border-border text-sm text-foreground`}
          {...rest}
        />
      </View>
    </View>
  );
}
