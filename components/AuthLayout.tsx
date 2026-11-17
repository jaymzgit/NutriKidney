import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import Card from "./Card";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
}: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md self-center">
            <View className="items-center mb-8">
              <Text className="text-caption font-bold text-primary mb-4">
                NutriKidney
              </Text>
              <View className="h-16 w-16 rounded-full bg-primary-soft items-center justify-center mb-4">
                <Icon size={28} color={colors.primary} strokeWidth={2} />
              </View>
              <Text
                className="text-display font-bold text-foreground text-center"
                accessibilityRole="header"
              >
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-body text-muted-foreground mt-2 text-center">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Card padded={false} className="p-6">{children}</Card>
            {footer ? <View className="items-center mt-6">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
