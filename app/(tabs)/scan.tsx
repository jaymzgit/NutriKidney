import { useCallback, useEffect, useRef, useState } from "react";
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
import * as ImageManipulator from "expo-image-manipulator";
import {
  Camera,
  Check,
  ImageIcon,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import Button from "@/components/Button";
import { detectFood, isModelLoaded } from "@/lib/yolo";
import { matchFood, scaleFood, searchFoods } from "@/lib/foodDb";
import { createMeal } from "@/lib/mealsRepo";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ── Types ──────────────────────────────────────────── */

type ModeKey = "scan" | "manual";

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

type BBox = { x: number; y: number; w: number; h: number };
type CartItem = FoodResult & { id: string; bbox?: BBox };

/* ── Constants ──────────────────────────────────────── */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const BBOX_COLORS = [
  "#1A7A55",
  "#E6A817",
  "#2783A6",
  "#DC2626",
  "#7C3AED",
  "#DB2777",
  "#059669",
  "#D97706",
];

const modes: Mode[] = [
  {
    key: "scan",
    icon: Camera,
    label: "Scan",
    title: "Scan Food Photo",
    description: "Take a photo and AI will identify each food item",
    color: "#1A7A55",
  },
  {
    key: "manual",
    icon: Search,
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
  const [active, setActive] = useState<ModeKey>("scan");
  const current = modes.find((m) => m.key === active)!;

  // Camera
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Review
  const [showReview, setShowReview] = useState(false);
  const [scanSource, setScanSource] = useState<"device" | "api" | null>(null);
  const [scanImageUri, setScanImageUri] = useState<string | null>(null);
  const [scanImageSize, setScanImageSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // Manual search (local)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);

  // Cart + submit
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Model preloaded at root layout — just track ready state
  useEffect(() => {
    if (isModelLoaded()) {
      setModelReady(true);
      return;
    }
    const t = setInterval(() => {
      if (isModelLoaded()) {
        setModelReady(true);
        clearInterval(t);
      }
    }, 250);
    return () => clearInterval(t);
  }, []);

  // Auto-close review when cart empties
  useEffect(() => {
    if (showReview && cart.length === 0) setShowReview(false);
  }, [showReview, cart.length]);

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
        Alert.alert(
          "Permission needed",
          "Camera access is required to scan meals."
        );
        return;
      }
    }
    setCapturedUri(null);
    setShowCamera(true);
  }, [permission, requestPermission]);

  // Re-encode image to bake EXIF orientation into pixels.
  // Without this, RN <Image> rotates per EXIF but jpeg-js decoder doesn't,
  // so model coords + display overlay drift.
  const bakeOrientation = async (uri: string): Promise<string> => {
    const out = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.9,
    });
    return out.uri;
  };

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    if (photo?.uri) {
      const baked = await bakeOrientation(photo.uri);
      setCapturedUri(baked);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const baked = await bakeOrientation(result.assets[0].uri);
      setCapturedUri(baked);
      setShowCamera(true);
    }
  }, []);

  /* ── Detection (on-device YOLO → API fallback) ───── */

  const usePhoto = useCallback(async () => {
    if (!capturedUri) return;
    setDetecting(true);
    try {
      let newItems: CartItem[];
      let imgW = 0;
      let imgH = 0;

      if (isModelLoaded()) {
        setScanSource("device");
        // ─── On-device YOLO ──────────────────────
        const { detections, imageWidth, imageHeight } =
          await detectFood(capturedUri);
        imgW = imageWidth;
        imgH = imageHeight;

        newItems = detections.map((det) => {
          const match = matchFood(det.className);

          // Portion estimation from bbox area
          const areaFraction =
            (det.width * det.height) / (imageWidth * imageHeight);
          const portionScale = Math.max(
            0.5,
            Math.min(2.0, areaFraction / 0.12)
          );

          if (match) {
            const portion = Math.round(match.food.portion_g * portionScale);
            const scaled = scaleFood(match.food, portion);
            return {
              id: uid(),
              name: scaled.name,
              portion_g: scaled.portion_g,
              calories: scaled.calories,
              potassium_mg: scaled.potassium_mg,
              phosphorus_mg: scaled.phosphorus_mg,
              sodium_mg: scaled.sodium_mg,
              protein_g: scaled.protein_g,
              carbs_g: scaled.carbs_g,
              fat_g: scaled.fat_g,
              confidence:
                Math.round(det.confidence * match.confidence * 100) / 100,
              bbox: { x: det.x, y: det.y, w: det.width, h: det.height },
            };
          }

          return {
            id: uid(),
            name: det.className.replace(/-/g, " "),
            portion_g: Math.round(150 * portionScale),
            calories: 0,
            potassium_mg: 0,
            phosphorus_mg: 0,
            sodium_mg: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            confidence: Math.round(det.confidence * 0.3 * 100) / 100,
            bbox: { x: det.x, y: det.y, w: det.width, h: det.height },
          };
        });
      } else {
        setScanSource("api");
        // ─── API fallback ────────────────────────
        const formData = new FormData();
        formData.append("file", {
          uri: capturedUri,
          type: "image/jpeg",
          name: "meal.jpg",
        } as any);

        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"}/scan/detect`,
          { method: "POST", body: formData }
        );

        if (!res.ok) throw new Error(`Detection failed (${res.status})`);
        const data = await res.json();
        newItems = (data.items || []).map((item: FoodResult) => ({
          ...item,
          id: uid(),
        }));
      }

      setCart((prev) => [...prev, ...newItems]);
      setScanImageUri(capturedUri);
      if (imgW > 0) setScanImageSize({ w: imgW, h: imgH });
      setShowCamera(false);
      setCapturedUri(null);

      if (newItems.length === 0) {
        Alert.alert(
          "No foods detected",
          "Try a clearer photo or use manual entry."
        );
      } else {
        setShowReview(true);
      }
    } catch (e: any) {
      Alert.alert(
        "Detection failed",
        modelReady
          ? e?.message || "Unknown error"
          : "YOLO model not loaded. Use the API backend or build a custom dev client."
      );
      setShowCamera(false);
      setCapturedUri(null);
    } finally {
      setDetecting(false);
    }
  }, [capturedUri, modelReady]);

  /* ── Manual search (local food DB) ────────────────── */

  const searchFood = useCallback((text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const matches = searchFoods(text.trim());
    setResults(
      matches.map((m) => ({
        name: m.food.name,
        portion_g: m.food.portion_g,
        calories: m.food.calories,
        potassium_mg: m.food.potassium_mg,
        phosphorus_mg: m.food.phosphorus_mg,
        sodium_mg: m.food.sodium_mg,
        protein_g: m.food.protein_g,
        carbs_g: m.food.carbs_g,
        fat_g: m.food.fat_g,
        confidence: m.confidence,
      }))
    );
  }, []);

  /* ── Submit ───────────────────────────────────────── */

  const submitMeal = useCallback(async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const mealId = await createMeal({
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
      if (scanImageUri) {
        AsyncStorage.setItem(`meal_photo_${mealId}`, scanImageUri).catch(() => {});
      }
      setCart([]);
      setShowReview(false);
      setScanImageUri(null);
      setScanImageSize(null);
      setQuery("");
      setResults([]);
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
          <Image
            source={{ uri: capturedUri }}
            style={styles.cameraPreview}
            resizeMode="contain"
          />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
          />
        )}

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
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
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          {capturedUri ? (
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

  /* ── Review screen with highlighted image ────────── */

  if (showReview && cart.length > 0) {
    const displayW = SCREEN_W - 32;
    const displayH =
      scanImageSize && scanImageSize.w > 0
        ? displayW * (scanImageSize.h / scanImageSize.w)
        : displayW * 0.75;

    const totalCal = cart.reduce((a, c) => a + c.calories, 0);
    const totalK = cart.reduce((a, c) => a + c.potassium_mg, 0);
    const totalP = cart.reduce((a, c) => a + c.phosphorus_mg, 0);
    const totalNa = cart.reduce((a, c) => a + c.sodium_mg, 0);
    const totalPro = cart.reduce((a, c) => a + c.protein_g, 0);

    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScrollView
          className="px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => {
                setShowReview(false);
                setCart([]);
                setScanImageUri(null);
                setScanImageSize(null);
                setScanSource(null);
                setCapturedUri(null);
                setShowCamera(false);
              }}
              className="mr-3 p-1"
            >
              <X size={20} color="#6B7280" />
            </Pressable>
            <Text className="text-lg font-bold text-foreground">
              Review Your Meal
            </Text>
            {scanSource && (
              <View
                className={`ml-auto px-2 py-1 rounded-full ${
                  scanSource === "device" ? "bg-primary/15" : "bg-amber-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-semibold ${
                    scanSource === "device"
                      ? "text-primary"
                      : "text-amber-800"
                  }`}
                >
                  {scanSource === "device" ? "On-Device YOLO26" : "Cloud API"}
                </Text>
              </View>
            )}
          </View>

          {/* Image with bounding box overlays */}
          {scanImageUri && scanImageSize && (
            <View
              className="rounded-2xl overflow-hidden mb-4 border border-border"
              style={{ width: displayW, height: displayH }}
            >
              <Image
                source={{ uri: scanImageUri }}
                style={{ width: displayW, height: displayH }}
                resizeMode="cover"
              />
              {cart.flatMap((item, idx) => {
                if (!item.bbox || !scanImageSize) return [];
                const sx = displayW / scanImageSize.w;
                const sy = displayH / scanImageSize.h;
                const color = BBOX_COLORS[idx % BBOX_COLORS.length];
                const left = item.bbox.x * sx;
                const top = item.bbox.y * sy;
                const w = item.bbox.w * sx;
                const h = item.bbox.h * sy;
                return [
                  <View
                    key={`bbox-${item.id}`}
                    pointerEvents="none"
                    style={[
                      styles.bbox,
                      {
                        left,
                        top,
                        width: w,
                        height: h,
                        borderColor: color,
                      },
                    ]}
                  />,
                  <View
                    key={`lbl-${item.id}`}
                    pointerEvents="none"
                    style={[
                      styles.bboxLabel,
                      {
                        backgroundColor: color,
                        left,
                        top: Math.max(0, top - 16),
                      },
                    ]}
                  >
                    <Text style={styles.bboxLabelText} numberOfLines={1}>
                      {item.name} {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>,
                ];
              })}
            </View>
          )}

          {/* Detected items */}
          {cart.map((item, idx) => (
            <View
              key={item.id}
              className="bg-card rounded-2xl border border-border p-4 mb-3"
            >
              {/* Name + color dot + confidence + remove */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: item.bbox
                        ? BBOX_COLORS[idx % BBOX_COLORS.length]
                        : "#9CA3AF",
                      marginRight: 8,
                    }}
                  />
                  <Text className="text-sm font-bold text-foreground flex-1">
                    {item.name}
                  </Text>
                </View>
                {item.confidence > 0 && (
                  <View className="bg-muted px-2 py-0.5 rounded-full mr-2">
                    <Text className="text-[10px] text-muted-foreground">
                      {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => removeFromCart(item.id)}>
                  <Trash2 size={16} color="#DC2626" />
                </Pressable>
              </View>

              {/* Portion adjustment */}
              <View className="flex-row items-center justify-center bg-muted/50 rounded-xl py-2 mb-3">
                <Pressable
                  onPress={() => adjustPortion(item.id, -5)}
                  className="h-9 w-9 bg-card rounded-lg items-center justify-center border border-border"
                >
                  <Minus size={14} color="#6B7280" />
                </Pressable>
                <Text className="text-base font-bold text-foreground mx-4 min-w-[60px] text-center">
                  {Math.round(item.portion_g)}g
                </Text>
                <Pressable
                  onPress={() => adjustPortion(item.id, 5)}
                  className="h-9 w-9 bg-card rounded-lg items-center justify-center border border-border"
                >
                  <Plus size={14} color="#6B7280" />
                </Pressable>
              </View>

              {/* Nutrient grid */}
              <View className="flex-row flex-wrap">
                {[
                  { label: "Calories", val: `${Math.round(item.calories)}`, u: "kcal" },
                  { label: "Potassium", val: `${Math.round(item.potassium_mg)}`, u: "mg" },
                  { label: "Phosphorus", val: `${Math.round(item.phosphorus_mg)}`, u: "mg" },
                  { label: "Sodium", val: `${Math.round(item.sodium_mg)}`, u: "mg" },
                  { label: "Protein", val: item.protein_g.toFixed(1), u: "g" },
                  { label: "Carbs", val: item.carbs_g.toFixed(1), u: "g" },
                  { label: "Fat", val: item.fat_g.toFixed(1), u: "g" },
                ].map((n) => (
                  <View key={n.label} className="w-1/3 mb-2">
                    <Text className="text-[10px] text-muted-foreground">
                      {n.label}
                    </Text>
                    <Text className="text-xs font-semibold text-foreground">
                      {n.val} {n.u}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Meal totals */}
          <View className="bg-muted/50 rounded-xl border border-border p-3 mb-4">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Meal Totals
            </Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-1">
              <Text className="text-xs font-semibold text-foreground">
                {Math.round(totalCal)} kcal
              </Text>
              <Text className="text-xs text-foreground">
                K: {Math.round(totalK)}mg
              </Text>
              <Text className="text-xs text-foreground">
                P: {Math.round(totalP)}mg
              </Text>
              <Text className="text-xs text-foreground">
                Na: {Math.round(totalNa)}mg
              </Text>
              <Text className="text-xs text-foreground">
                Pro: {totalPro.toFixed(1)}g
              </Text>
            </View>
          </View>

          {/* Log button */}
          <Button onPress={submitMeal} loading={submitting}>
            <View className="flex-row items-center">
              <Check size={18} color="#FFFFFF" />
              <Text className="text-primary-foreground font-semibold ml-2">
                Log Meal ({cart.length} item{cart.length > 1 ? "s" : ""})
              </Text>
            </View>
          </Button>
        </ScrollView>
      </SafeAreaView>
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

        {/* Mode selector */}
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

        {/* Mode header card */}
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
            {!modelReady && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                <Text className="text-xs text-amber-800">
                  On-device model not loaded. Will fall back to API detection.
                  For offline use, place your TFLite model at
                  assets/models/food_detect.tflite and build a custom dev
                  client.
                </Text>
              </View>
            )}
            <Button onPress={openCamera} className="mb-3">
              <View className="flex-row items-center">
                <Camera size={20} color="#FFFFFF" />
                <Text className="text-primary-foreground font-semibold ml-2">
                  Open Camera
                </Text>
              </View>
            </Button>
            <Button variant="outline" onPress={pickFromGallery}>
              <View className="flex-row items-center">
                <ImageIcon size={20} color="#181F29" />
                <Text className="text-foreground font-semibold ml-2">
                  Upload from Gallery
                </Text>
              </View>
            </Button>
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

            {query.length >= 2 && results.length === 0 && (
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
                      onPress={() => adjustPortion(item.id, -5)}
                      className="h-8 w-8 bg-muted rounded-lg items-center justify-center"
                    >
                      <Minus size={14} color="#6B7280" />
                    </Pressable>
                    <Text className="text-sm font-medium text-foreground mx-3 min-w-[50px] text-center">
                      {Math.round(item.portion_g)}g
                    </Text>
                    <Pressable
                      onPress={() => adjustPortion(item.id, 5)}
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

/* ── Styles ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: "#000" },
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
  useBtn: { backgroundColor: "#1A7A55" },
  freezeBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  // Bounding box overlay styles
  bbox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 6,
  },
  bboxLabel: {
    position: "absolute",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  bboxLabelText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 0,
  },
});
