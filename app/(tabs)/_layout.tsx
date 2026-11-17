import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Clock, Home, MessageCircle, User } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { tokens, useTheme } from "@/lib/theme";

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
}) {
  return <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

function CenterTabButton({ onPress, accessibilityState }: any) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel="Log a meal"
      accessibilityState={{ selected: !!focused }}
      className="flex-1 items-center justify-center -mt-5"
    >
      <View
        className="h-14 w-14 rounded-full items-center justify-center bg-primary border-4 border-card"
        style={{
          shadowColor: colors.shadow,
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Camera size={24} color={colors.primaryForeground} strokeWidth={2.5} />
      </View>
      <Text
        allowFontScaling={false}
        className={`text-caption font-bold ${
          focused ? "text-primary" : "text-muted-foreground"
        }`}
      >
        Log meal
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, textScale } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        tabBarHideOnKeyboard: true,
        // Labels are fixed-size so five tabs never overflow; they're already large.
        tabBarAllowFontScaling: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: tokens.fontSize.caption[0] * Math.min(textScale, 1.15),
          fontWeight: tokens.fontWeight.bold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Clock} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Log Meal",
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="lab-reports" options={{ href: null, title: "Lab Reports" }} />
    </Tabs>
  );
}
