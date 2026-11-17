import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider, tokens, useTheme } from "@/lib/theme";
import { ToastProvider } from "@/components/Toast";
import { loadModel } from "@/lib/yolo";

function AuthGate() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { colors, textScale } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoadingAuth) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoadingAuth, segments, router]);

  if (isLoadingAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="streak"
        options={{
          headerShown: true,
          title: "Streak",
          headerBackTitle: "Back",
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            color: colors.foreground,
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.title[0] * textScale,
          },
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          headerShown: true,
          title: "Nutrient Alerts",
          headerBackTitle: "Back",
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            color: colors.foreground,
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.title[0] * textScale,
          },
        }}
      />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  useEffect(() => {
    loadModel()
      .then(() => console.log("[YOLO] Model loaded OK (root)"))
      .catch((err) =>
        console.log("[YOLO] Model load FAILED (root):", err?.message ?? err)
      );
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemedStatusBar />
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
