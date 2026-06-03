import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Clock, Home, MessageCircle, User } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
}) {
  return <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

function CenterTabButton({ onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center -mt-5"
    >
      <View
        className={`h-14 w-14 rounded-full items-center justify-center ${
          focused ? "bg-primary/90" : "bg-primary"
        }`}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Camera size={24} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <Text
        className={`text-[10px] font-medium mt-0.5 ${
          focused ? "text-primary" : "text-muted-foreground"
        }`}
      >
        Log Meal
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A7A55",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E5E8",
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
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
