import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  Mic,
  Pencil,
  Upload,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import Button from "@/components/Button";

type Mode = {
  key: "scan" | "voice" | "manual";
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
};

const modes: Mode[] = [
  {
    key: "scan",
    icon: Camera,
    title: "Scan Food Photo",
    description:
      "Take a photo of your meal and our AI will identify the foods and estimate portions",
    color: "#1A7A55",
  },
  {
    key: "voice",
    icon: Mic,
    title: "Voice Entry",
    description:
      "Describe what you ate and we'll log it for you — speak naturally in English or Malay",
    color: "#E6A817",
  },
  {
    key: "manual",
    icon: Pencil,
    title: "Manual Log",
    description: "Search our Malaysian food database and log items with custom portions",
    color: "#2783A6",
  },
];

export default function ScanMeal() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<Mode["key"] | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.push("/(tabs)")} className="mr-3">
            <ArrowLeft size={20} color="#6B7280" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Log a Meal</Text>
        </View>

        {!selectedMode ? (
          <View>
            <Text className="text-sm text-muted-foreground mb-6">
              Choose how you'd like to log your meal
            </Text>
            <View>
              {modes.map(({ key, icon: Icon, title, description, color }) => (
                <Pressable
                  key={key}
                  onPress={() => setSelectedMode(key)}
                  className="flex-row items-start p-4 bg-card rounded-xl border border-border mb-3 active:opacity-80"
                >
                  <View
                    className="h-12 w-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <Icon size={24} color="#FFFFFF" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-sm font-bold text-foreground">
                      {title}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <ModeView
            mode={selectedMode}
            onBack={() => setSelectedMode(null)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeView({ mode, onBack }: { mode: Mode["key"]; onBack: () => void }) {
  const config = modes.find((m) => m.key === mode)!;
  const Icon = config.icon;

  return (
    <View>
      <Pressable onPress={onBack} className="flex-row items-center mb-6">
        <ArrowLeft size={16} color="#1A7A55" />
        <Text className="text-sm text-primary font-medium ml-1">
          Back to options
        </Text>
      </Pressable>

      <View className="items-center py-12">
        <View
          className="h-20 w-20 rounded-2xl items-center justify-center mb-6"
          style={{ backgroundColor: config.color }}
        >
          <Icon size={40} color="#FFFFFF" />
        </View>
        <Text className="text-lg font-bold text-foreground mb-2 text-center">
          {config.title}
        </Text>
        <Text className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
          {config.description}
        </Text>

        {mode === "scan" ? (
          <View className="w-full">
            <Button disabled className="mb-3">
              <View className="flex-row items-center">
                <Camera size={20} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Take Photo
                </Text>
              </View>
            </Button>
            <Button variant="outline" disabled className="mb-3">
              <View className="flex-row items-center">
                <Upload size={20} color="#181F29" />
                <Text className="text-foreground font-semibold ml-2">
                  Upload from Gallery
                </Text>
              </View>
            </Button>
            <Text className="text-xs text-muted-foreground italic text-center">
              Photo scanning will be available in a future update
            </Text>
          </View>
        ) : null}

        {mode === "voice" ? (
          <View className="w-full">
            <Button disabled className="mb-3">
              <View className="flex-row items-center">
                <Mic size={20} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Start Recording
                </Text>
              </View>
            </Button>
            <Text className="text-xs text-muted-foreground italic text-center">
              Voice entry will be available in a future update
            </Text>
          </View>
        ) : null}

        {mode === "manual" ? (
          <View className="w-full">
            <TextInput
              placeholder="Search Malaysian foods..."
              placeholderTextColor="#9CA3AF"
              editable={false}
              className="h-12 px-4 rounded-xl bg-muted border border-border text-sm text-foreground mb-3"
            />
            <Text className="text-xs text-muted-foreground italic text-center">
              Manual food search will be available in a future update
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
