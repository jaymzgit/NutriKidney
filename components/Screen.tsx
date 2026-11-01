import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import type { RefreshControlProps, ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  /** Fixed above the scrolling content. */
  header?: React.ReactNode;
  /** Sticky at the bottom — the thumb zone for primary actions. */
  footer?: React.ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. chat). */
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: Edge[];
  scrollRef?: React.Ref<ScrollView>;
  onContentSizeChange?: ScrollViewProps["onContentSizeChange"];
};

/** Standard screen shell: safe area, keyboard avoidance, readable max width. */
export default function Screen({
  children,
  header,
  footer,
  scroll = true,
  refreshControl,
  edges = ["top"],
  scrollRef,
  onContentSizeChange,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {header ? (
          <View className="px-5 pt-2 w-full max-w-[600px] self-center">
            {header}
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            onContentSizeChange={onContentSizeChange}
          >
            <View className="w-full max-w-[600px] self-center">{children}</View>
          </ScrollView>
        ) : (
          <View className="flex-1 w-full max-w-[600px] self-center">
            {children}
          </View>
        )}
        {footer ? (
          <View className="px-5 pt-4 pb-4 bg-background border-t border-border">
            <View className="w-full max-w-[600px] self-center">{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
