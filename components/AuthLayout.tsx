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
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md self-center">
            <View className="items-center mb-10">
              <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-4">
                <Icon size={28} color="#FFFFFF" />
              </View>
              <Text className="text-3xl font-bold text-foreground tracking-tight">
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-muted-foreground mt-2 text-center">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View className="bg-card rounded-2xl border border-border p-6">
              {children}
            </View>
            {footer ? (
              <View className="items-center mt-6">{footer}</View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
