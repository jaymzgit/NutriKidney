import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Check,
  ImageIcon,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import Button from "@/components/Button";
import { api } from "@/lib/api";

/* ── Types ──────────────────────────────────────────── */

type ModeKey = "scan" | "text" | "manual";

type Mode = {
  key: ModeKey;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  color: string;
};

type FoodResult = {
  name: string;
  portion_g: number;
  calories: number;
  potassium_mg: number;
  phosphorus_mg: number;
  sodium_mg: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
};

type CartItem = FoodResult & { id: string };

/* ── Constants ──────────────────────────────────────── */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const modes: Mode[] = [
  {
    key: "scan",
    icon: Camera,
    label: "Scan",
    title: "Scan Food Photo",
    description:
      "Take a photo of your meal and our AI will identify the foods",
    color: "#1A7A55",
  },
  {
    key: "text",
    icon: Pencil,
    label: "Describe",
    title: "Describe Your Meal",
    description:
      "Type what you ate in plain language and we'll find the foods for you",
    color: "#E6A817",
  },
  {
    key: "manual",
    icon: Pencil,
    label: "Manual",
    title: "Manual Log",
    description:
      "Search our Malaysian food database and log items with custom portions",
    color: "#2783A6",
  },
];

let nextId = 0;
function uid() {
  return `cart-${++nextId}`;
}

/* ── Component ──────────────────────────────────────── */

export default function ScanMeal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<ModeKey>("manual");
  const current = modes.find((m) => m.key === active)!;

  // Camera state
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Manual search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Text parse state
  const [descText, setDescText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<FoodResult[]>([]);

  // Shared cart + submission
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Cart helpers ──────────────────────────────────── */

  const addToCart = useCallback((item: FoodResult) => {
    setCart((prev) => [...prev, { ...item, id: uid() }]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const adjustPortion = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const base = item.portion_g;
        const newPortion = Math.max(10, base + delta);
        const ratio = newPortion / base;
        return {
          ...item,
          portion_g: newPortion,
          calories: Math.round(item.calories * ratio),
          potassium_mg: Math.round(item.potassium_mg * ratio),
          phosphorus_mg: Math.round(item.phosphorus_mg * ratio),
          sodium_mg: Math.round(item.sodium_mg * ratio),
          protein_g: Math.round(item.protein_g * ratio * 10) / 10,
          carbs_g: Math.round(item.carbs_g * ratio * 10) / 10,
          fat_g: Math.round(item.fat_g * ratio * 10) / 10,
        };
      })
    );
  }, []);

  /* ── Camera ───────────────────────────────────────── */

  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission needed", "Camera access is required to scan meals.");
        return;
      }
    }
    setCapturedUri(null);
    setShowCamera(true);
  }, [permission, requestPermission]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    if (photo?.uri) {
      setCapturedUri(photo.uri);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
      setShowCamera(true);
    }
  }, []);

  const usePhoto = useCallback(async () => {
    if (!capturedUri) return;
    setDetecting(true);
    try {
      // Send to backend /scan/detect (Step 5 wires this endpoint)
      const formData = new FormData();
      formData.append("file", {
        uri: capturedUri,
        type: "image/jpeg",
        name: "meal.jpg",
      } as any);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"}/scan/detect`,
        {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (!res.ok) throw new Error(`Detection failed (${res.status})`);

      const data = await res.json();
      const items: FoodResult[] = data.items || [];

      for (const item of items) {
        addToCart(item);
      }

      setShowCamera(false);
      setCapturedUri(null);

      if (items.length === 0) {
        Alert.alert("No foods detected", "Try a clearer photo or use manual entry.");
      }
    } catch {
      Alert.alert("Detection unavailable", "Food scan backend not connected yet. Use manual or describe mode.");
      setShowCamera(false);
      setCapturedUri(null);
    } finally {
      setDetecting(false);
    }
  }, [capturedUri, addToCart]);

  /* ── Manual search ────────────────────────────────── */

  const searchFood = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.post<{ found: boolean; items: FoodResult[] }>(
          "/food/lookup",
          { query: text.trim() }
        );
        setResults(res.found ? res.items : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  /* ── Text parse ───────────────────────────────────── */

  const parseDescription = useCallback(async () => {
    if (!descText.trim()) return;
    setParsing(true);
    try {
      const res = await api.post<{ items: FoodResult[]; raw_text: string }>(
        "/food/parse",
        { text: descText.trim() }
      );
      setParsedItems(res.items);
    } catch {
      Alert.alert("Error", "Failed to parse food description");
    } finally {
      setParsing(false);
    }
  }, [descText]);

  const addAllParsed = useCallback(() => {
    for (const item of parsedItems) {
      addToCart(item);
    }
    setParsedItems([]);
    setDescText("");
  }, [parsedItems, addToCart]);

  /* ── Submit ───────────────────────────────────────── */

  const submitMeal = useCallback(async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await api.post("/logs/meals", {
        method: active,
        items: cart.map((c) => ({
          food_name: c.name,
          portion_g: c.portion_g,
          calories: c.calories,
          potassium_mg: c.potassium_mg,
          phosphorus_mg: c.phosphorus_mg,
          sodium_mg: c.sodium_mg,
          protein_g: c.protein_g,
          carbs_g: c.carbs_g,
          fat_g: c.fat_g,
          confidence: c.confidence,
        })),
      });
      setCart([]);
      setQuery("");
      setResults([]);
      setDescText("");
      setParsedItems([]);
      Alert.alert("Logged", "Meal saved successfully");
      router.navigate("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log meal");
    } finally {
      setSubmitting(false);
    }
  }, [cart, active, router]);

  /* ── Full-screen camera overlay ───────────────────── */

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />

        {capturedUri ? (
          // Freeze frame
          <Image
            source={{ uri: capturedUri }}
            style={styles.cameraPreview}
            resizeMode="cover"
          />
        ) : (
          // Live preview
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
          />
        )}

        {/* Top bar */}
        <View
          style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        >
          <Pressable
            onPress={() => {
              setShowCamera(false);
              setCapturedUri(null);
            }}
            style={styles.iconBtn}
          >
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Scan Your Meal</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Bottom controls */}
        <View
          style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}
        >
          {capturedUri ? (
            // Freeze-frame controls
            <View style={styles.freezeControls}>
              <Pressable
                onPress={() => setCapturedUri(null)}
                style={styles.freezeBtn}
              >
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.freezeBtnText}>Retake</Text>
              </Pressable>

              {detecting ? (
                <View style={[styles.freezeBtn, styles.useBtn]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.freezeBtnText}>Detecting...</Text>
                </View>
              ) : (
                <Pressable
                  onPress={usePhoto}
                  style={[styles.freezeBtn, styles.useBtn]}
                >
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.freezeBtnText}>Use Photo</Text>
                </Pressable>
              )}
            </View>
          ) : (
            // Capture controls
            <View style={styles.captureRow}>
              <Pressable onPress={pickFromGallery} style={styles.iconBtn}>
                <ImageIcon size={24} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={takePicture} style={styles.captureBtn}>
                <View style={styles.captureInner} />
              </Pressable>
              <View style={{ width: 40 }} />
            </View>
          )}
        </View>
      </View>
    );
  }

  /* ── Main render ──────────────────────────────────── */

  const cartTotal = cart.reduce((a, c) => a + c.calories, 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-lg font-bold text-foreground mb-4">
          Log a Meal
        </Text>

        {/* Mode selector pills */}
        <View className="flex-row bg-muted rounded-xl p-1 mb-6">
          {modes.map(({ key, icon: Icon, label, color }) => {
            const selected = key === active;
            return (
              <Pressable
                key={key}
                onPress={() => setActive(key)}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                  selected ? "bg-card" : ""
                }`}
                style={
                  selected
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    : undefined
                }
              >
                <Icon size={16} color={selected ? color : "#9CA3AF"} />
                <Text
                  className={`ml-1.5 text-[13px] font-semibold ${
                    selected ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active mode header */}
        <View className="bg-card rounded-2xl border border-border p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <View
              className="h-10 w-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: current.color }}
            >
              <current.icon size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                {current.title}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {current.description}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Scan mode ──────────────────────────────── */}
        {active === "scan" && (
          <View className="bg-card rounded-2xl border border-border p-4">
            <Button onPress={openCamera} className="mb-3">
              <View className="flex-row items-center">
                <Camera size={20} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Open Camera
                </Text>
              </View>
            </Button>
            <Button variant="outline" onPress={pickFromGallery} className="mb-3">
              <View className="flex-row items-center">
                <ImageIcon size={20} color="#181F29" />
                <Text className="text-foreground font-semibold ml-2">
                  Upload from Gallery
                </Text>
              </View>
            </Button>
          </View>
        )}

        {/* ── Text describe mode ──────────────────────── */}
        {active === "text" && (
          <View className="bg-card rounded-2xl border border-border p-4">
            <Text className="text-xs text-muted-foreground mb-2">
              Describe what you ate (e.g. "1 plate of rice with chicken and
              kangkung")
            </Text>
            <TextInput
              value={descText}
              onChangeText={setDescText}
              placeholder="I had 1 plate of nasi lemak with sambal..."
              placeholderTextColor="#9CA3AF"
              multiline
              className="h-24 px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground mb-3"
              style={{ textAlignVertical: "top" }}
            />
            <Button
              onPress={parseDescription}
              loading={parsing}
              disabled={!descText.trim()}
              className="mb-3"
            >
              <View className="flex-row items-center">
                <Search size={18} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Find Foods
                </Text>
              </View>
            </Button>

            {parsedItems.length > 0 && (
              <View className="mt-2">
                <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Found {parsedItems.length} item
                  {parsedItems.length > 1 ? "s" : ""}
                </Text>
                {parsedItems.map((item, i) => (
                  <View
                    key={i}
                    className="flex-row items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5 mb-1.5"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {item.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {Math.round(item.portion_g)}g ·{" "}
                        {Math.round(item.calories)} kcal
                      </Text>
                    </View>
                    {item.confidence < 0.4 && (
                      <Text className="text-[10px] text-amber-600 mr-2">
                        Low match
                      </Text>
                    )}
                  </View>
                ))}
                <Button onPress={addAllParsed} className="mt-2">
                  <View className="flex-row items-center">
                    <Plus size={18} color="#FFFFFF" />
                    <Text className="text-primary-foreground font-semibold ml-2">
                      Add All to Meal
                    </Text>
                  </View>
                </Button>
              </View>
            )}
          </View>
        )}

        {/* ── Manual mode ────────────────────────────── */}
        {active === "manual" && (
          <View className="bg-card rounded-2xl border border-border p-4">
            <View className="flex-row items-center bg-muted rounded-xl border border-border px-3 mb-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={searchFood}
                placeholder="Search Malaysian foods..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 h-12 ml-2 text-sm text-foreground"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <X size={16} color="#9CA3AF" />
                </Pressable>
              )}
            </View>

            {searching && (
              <ActivityIndicator
                size="small"
                color="#2783A6"
                className="my-3"
              />
            )}

            {results.length > 0 && (
              <View>
                <Text className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Results
                </Text>
                {results.map((item, i) => (
                  <Pressable
                    key={i}
                    onPress={() => addToCart(item)}
                    className="flex-row items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5 mb-1.5 active:bg-muted"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {item.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {Math.round(item.portion_g)}g ·{" "}
                        {Math.round(item.calories)} kcal
                      </Text>
                    </View>
                    <Plus size={18} color="#2783A6" />
                  </Pressable>
                ))}
              </View>
            )}

            {!searching && query.length >= 2 && results.length === 0 && (
              <Text className="text-xs text-muted-foreground text-center py-4">
                No foods found for "{query}"
              </Text>
            )}
          </View>
        )}

        {/* ── Cart ───────────────────────────────────── */}
        {cart.length > 0 && (
          <View className="bg-card rounded-2xl border border-border p-4 mt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-foreground">
                Your Meal
              </Text>
              <Text className="text-xs font-semibold text-muted-foreground">
                {Math.round(cartTotal)} kcal
              </Text>
            </View>

            {cart.map((item) => (
              <View
                key={item.id}
                className="bg-muted/40 rounded-xl px-3 py-3 mb-2 border border-border/50"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-foreground flex-1">
                    {item.name}
                  </Text>
                  <Pressable
                    onPress={() => removeFromCart(item.id)}
                    className="ml-2"
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </Pressable>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => adjustPortion(item.id, -25)}
                      className="h-8 w-8 bg-muted rounded-lg items-center justify-center"
                    >
                      <Minus size={14} color="#6B7280" />
                    </Pressable>
                    <Text className="text-sm font-medium text-foreground mx-3 min-w-[50px] text-center">
                      {Math.round(item.portion_g)}g
                    </Text>
                    <Pressable
                      onPress={() => adjustPortion(item.id, 25)}
                      className="h-8 w-8 bg-muted rounded-lg items-center justify-center"
                    >
                      <Plus size={14} color="#6B7280" />
                    </Pressable>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {Math.round(item.calories)} kcal
                  </Text>
                </View>
              </View>
            ))}

            <Button
              onPress={submitMeal}
              loading={submitting}
              className="mt-2"
            >
              <View className="flex-row items-center">
                <Check size={18} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Log Meal ({cart.length} item{cart.length > 1 ? "s" : ""})
                </Text>
              </View>
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Camera styles ──────────────────────────────────── */

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraPreview: {
    width: SCREEN_W,
    height: SCREEN_H,
    position: "absolute",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  freezeControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  freezeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  useBtn: {
    backgroundColor: "#1A7A55",
  },
  freezeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
