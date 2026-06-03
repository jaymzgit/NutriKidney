import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Heart,
  LogOut,
  Ruler,
  Scale,
  User,
} from "lucide-react-native";
import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";

const CKD_STAGES = [
  { value: 1, label: "Stage 1", desc: "Kidney damage, normal GFR (≥90)" },
  { value: 2, label: "Stage 2", desc: "Mild decrease (60–89)" },
  { value: 3, label: "Stage 3", desc: "Moderate decrease (30–59)" },
  { value: 4, label: "Stage 4", desc: "Severe decrease (15–29)" },
  { value: 5, label: "Stage 5", desc: "Kidney failure (<15)" },
];

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [ckdStage, setCkdStage] = useState<number | null>(
    user?.ckd_stage ?? null
  );
  const [weight, setWeight] = useState(
    user?.weight_kg ? String(user.weight_kg) : ""
  );
  const [height, setHeight] = useState(
    user?.height_cm ? String(user.height_cm) : ""
  );
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [gender, setGender] = useState<string>(user?.gender ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setCkdStage(user.ckd_stage ?? null);
      setWeight(user.weight_kg ? String(user.weight_kg) : "");
      setHeight(user.height_cm ? String(user.height_cm) : "");
      setAge(user.age ? String(user.age) : "");
      setGender(user.gender ?? "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ckd_stage: ckdStage,
        weight_kg: weight ? Number(weight) : null,
        height_cm: height ? Number(height) : null,
        age: age ? Number(age) : null,
        gender: gender || null,
      });
      Alert.alert("Saved", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const initial = user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <User size={20} color="#1A7A55" />
          <Text className="text-lg font-bold text-foreground ml-3">Profile</Text>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-xl font-bold text-primary">{initial}</Text>
            </View>
            <View className="ml-4">
              <Text className="text-base font-bold text-foreground">
                {user?.full_name || "User"}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <View className="flex-row items-center mb-4">
            <Heart size={16} color="#1A7A55" />
            <Text className="text-sm font-bold text-foreground ml-2">
              CKD Stage
            </Text>
          </View>
          <View>
            {CKD_STAGES.map(({ value, label, desc }) => (
              <Pressable
                key={value}
                onPress={() => setCkdStage(value)}
                className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${
                  ckdStage === value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {label}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {desc}
                  </Text>
                </View>
                {ckdStage === value ? (
                  <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
                    <View className="h-2 w-2 rounded-full bg-white" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <View className="flex-row items-center mb-4">
            <Activity size={16} color="#1A7A55" />
            <Text className="text-sm font-bold text-foreground ml-2">
              Body Measurements
            </Text>
          </View>

          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <View className="flex-row items-center mb-1">
                <Scale size={12} color="#6B7280" />
                <Text className="text-xs font-medium text-muted-foreground ml-1">
                  Weight (kg)
                </Text>
              </View>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="60"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="h-10 px-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="flex-row items-center mb-1">
                <Ruler size={12} color="#6B7280" />
                <Text className="text-xs font-medium text-muted-foreground ml-1">
                  Height (cm)
                </Text>
              </View>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="165"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="h-10 px-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Text className="text-xs font-medium text-muted-foreground mb-1">
                Age
              </Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="45"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="h-10 px-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Text className="text-xs font-medium text-muted-foreground mb-1">
                Gender
              </Text>
              <View className="flex-row">
                {[
                  { v: "male", label: "Male" },
                  { v: "female", label: "Female" },
                ].map(({ v, label }) => (
                  <Pressable
                    key={v}
                    onPress={() => setGender(v)}
                    className={`flex-1 h-10 rounded-lg border items-center justify-center mr-1 ${
                      gender === v
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        gender === v
                          ? "text-primary font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        <Button onPress={handleSave} loading={saving} className="mb-4">
          Save Profile
        </Button>

        <Button variant="destructive-outline" onPress={handleLogout}>
          <View className="flex-row items-center">
            <LogOut size={16} color="#DC2D27" />
            <Text className="text-destructive font-semibold ml-2">
              Sign Out
            </Text>
          </View>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
