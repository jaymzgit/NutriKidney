import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
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
  SearchX,
  Sun,
  Trash2,
  Utensils,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import Button from "@/components/Button";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import SectionTitle from "@/components/SectionTitle";
import SegmentedControl from "@/components/SegmentedControl";
import IconButton from "@/components/IconButton";
import Banner from "@/components/Banner";
import StatusBadge, { toStatus } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { detectFood, isModelLoaded } from "@/lib/yolo";
import { matchFood, scaleFood, searchFoods } from "@/lib/foodDb";
import { createMeal } from "@/lib/mealsRepo";
import { useAuth } from "@/lib/AuthContext";
import { useMeals } from "@/lib/useMeals";
import { getMealRiskLevel } from "@/lib/riskEngine";
import { tokens, useTheme } from "@/lib/theme";

/* ── Types ──────────────────────────────────────────── */

type ModeKey = "scan" | "manual";

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
type CartItem = FoodResult & { id: string; quantity: number; bbox?: BBox };

/* ── Constants ──────────────────────────────────────── */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const BBOX_COLORS = tokens.fixed.detection;

const MODE_OPTIONS: { value: ModeKey; label: string; icon: LucideIcon }[] = [
  { value: "scan", label: "Scan photo", icon: Camera },
  { value: "manual", label: "Search", icon: Search },
];

/** Shown before the user types, so the search screen is never blank. */
const POPULAR_SEARCHES = ["Rice", "Roti Canai", "Fried Egg", "Chicken Rendang", "Mee Rebus"];

let nextId = 0;
function uid() {
  return `cart-${++nextId}`;
}

/* ── Small UI pieces ─────────────────────────────────── */

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View className="flex-1 bg-muted rounded-sm p-2">
      <Text className="text-caption text-muted-foreground text-center">{label}</Text>
      <View className="flex-row items-center justify-between mt-1">
        <IconButton icon={Minus} soft tone="primary" accessibilityLabel={`Less ${label.toLowerCase()}`} onPress={onMinus} />
        <Text className="text-body font-bold text-foreground" accessibilityLiveRegion="polite">
          {value}
        </Text>
        <IconButton icon={Plus} soft tone="primary" accessibilityLabel={`More ${label.toLowerCase()}`} onPress={onPlus} />
      </View>
    </View>
  );
}

/* ── Component ──────────────────────────────────────── */

export default function ScanMeal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const [active, setActive] = useState<ModeKey>("scan");

  const { user } = useAuth();
  const ckdStage = user?.ckd_stage ?? null;
  const weightKg = user?.weight_kg ?? null;
  const { meals } = useMeals();

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

  // Android back button steps out of camera / review instead of leaving the tab.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (showCamera) {
          setShowCamera(false);
          setCapturedUri(null);
          return true;
        }
        if (showReview) {
          setShowReview(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [showCamera, showReview])
  );

  /* ── Cart helpers ──────────────────────────────────── */

  const addToCart = useCallback((item: FoodResult) => {
    setCart((prev) => [...prev, { ...item, id: uid(), quantity: 1 }]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const adjustQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(20, item.quantity + delta)) }
          : item
      )
    );
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
              quantity: 1,
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
            quantity: 1,
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
          quantity: 1,
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
      const todayStr = new Date().toDateString();
      const todayTotals = meals
        .filter((m) => new Date(m.logged_at).toDateString() === todayStr)
        .reduce(
          (acc, m) => ({
            potassium: acc.potassium + (m.total_potassium || 0),
            phosphorus: acc.phosphorus + (m.total_phosphorus || 0),
            sodium: acc.sodium + (m.total_sodium || 0),
            protein: acc.protein + (m.total_protein || 0),
          }),
          { potassium: 0, phosphorus: 0, sodium: 0, protein: 0 }
        );
      const risk = getMealRiskLevel(cart, ckdStage, weightKg, todayTotals);
      const mealId = await createMeal({
        method: active,
        risk_level: ckdStage ? (risk.level as "safe" | "caution" | "danger") : null,
        photoUri: scanImageUri,
        items: cart.map((c) => ({
          food_name: c.quantity > 1 ? `${c.name} ×${c.quantity}` : c.name,
          portion_g: c.portion_g * c.quantity,
          calories: c.calories * c.quantity,
          potassium_mg: c.potassium_mg * c.quantity,
          phosphorus_mg: c.phosphorus_mg * c.quantity,
          sodium_mg: c.sodium_mg * c.quantity,
          protein_g: c.protein_g * c.quantity,
          carbs_g: c.carbs_g * c.quantity,
          fat_g: c.fat_g * c.quantity,
          confidence: c.confidence,
        })),
      });
      setCart([]);
      setShowReview(false);
      setScanImageUri(null);
      setScanImageSize(null);
      setQuery("");
      setResults([]);
      toast("Meal saved — well done!");
      router.navigate("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log meal");
    } finally {
      setSubmitting(false);
    }
  }, [cart, active, router, meals, ckdStage, weightKg, scanImageUri, toast]);

  const logButton = (
    <Button onPress={submitMeal} loading={submitting} icon={Check}>
      {`Log meal · ${cart.length} item${cart.length > 1 ? "s" : ""}`}
    </Button>
  );

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
            accessibilityLabel="Your meal photo"
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
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <X size={24} color={tokens.fixed.white} />
          </Pressable>
          <Text style={styles.topTitle} accessibilityRole="header">
            {capturedUri ? "Use this photo?" : "Scan your meal"}
          </Text>
          <View style={{ width: 56 }} />
        </View>

        {/* Detecting overlay — turn the wait into reassurance */}
        {detecting ? (
          <View style={styles.detectingOverlay} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={tokens.fixed.white} />
            <Text style={styles.detectingTitle}>Finding the foods on your plate…</Text>
            <Text style={styles.detectingHint}>This usually takes a few seconds</Text>
          </View>
        ) : null}

        {/* Bottom controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          {capturedUri ? (
            <View style={styles.freezeControls}>
              <Pressable
                onPress={() => setCapturedUri(null)}
                disabled={detecting}
                style={[styles.freezeBtn, detecting && { opacity: 0.5 }]}
                accessibilityRole="button"
              >
                <RefreshCw size={20} color={tokens.fixed.white} />
                <Text style={styles.freezeBtnText}>Retake</Text>
              </Pressable>
              <Pressable
                onPress={usePhoto}
                disabled={detecting}
                style={[styles.freezeBtn, { backgroundColor: tokens.palettes.light.primary }]}
                accessibilityRole="button"
                accessibilityState={{ busy: detecting }}
              >
                <Check size={20} color={tokens.fixed.white} />
                <Text style={styles.freezeBtnText}>Use photo</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.cameraHint}>Fit the whole plate in the frame</Text>
              <View style={styles.captureRow}>
                <Pressable
                  onPress={pickFromGallery}
                  style={styles.sideBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Choose from gallery"
                >
                  <View style={styles.roundBtn}>
                    <ImageIcon size={24} color={tokens.fixed.white} />
                  </View>
                  <Text style={styles.sideBtnText}>Gallery</Text>
                </Pressable>
                <Pressable
                  onPress={takePicture}
                  style={styles.captureBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo"
                >
                  <View style={styles.captureInner} />
                </Pressable>
                <View style={styles.sideBtn} />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  /* ── Review screen with highlighted image ────────── */

  if (showReview && cart.length > 0) {
    const displayW = Math.min(SCREEN_W - 32, 600);
    const displayH =
      scanImageSize && scanImageSize.w > 0
        ? displayW * (scanImageSize.h / scanImageSize.w)
        : displayW * 0.75;

    const totalCal = cart.reduce((a, c) => a + c.calories * c.quantity, 0);
    const totalK = cart.reduce((a, c) => a + c.potassium_mg * c.quantity, 0);
    const totalP = cart.reduce((a, c) => a + c.phosphorus_mg * c.quantity, 0);
    const totalNa = cart.reduce((a, c) => a + c.sodium_mg * c.quantity, 0);
    const totalPro = cart.reduce((a, c) => a + c.protein_g * c.quantity, 0);

    const todayStr = new Date().toDateString();
    const todayTotals = meals
      .filter((m) => new Date(m.logged_at).toDateString() === todayStr)
      .reduce(
        (acc, m) => ({
          potassium: acc.potassium + (m.total_potassium || 0),
          phosphorus: acc.phosphorus + (m.total_phosphorus || 0),
          sodium: acc.sodium + (m.total_sodium || 0),
          protein: acc.protein + (m.total_protein || 0),
        }),
        { potassium: 0, phosphorus: 0, sodium: 0, protein: 0 }
      );
    const scaledCart = cart.map((c) => ({
      potassium_mg: c.potassium_mg * c.quantity,
      phosphorus_mg: c.phosphorus_mg * c.quantity,
      sodium_mg: c.sodium_mg * c.quantity,
      protein_g: c.protein_g * c.quantity,
    }));
    const mealRisk = getMealRiskLevel(scaledCart, ckdStage, weightKg, todayTotals);

    return (
      <Screen
        header={
          <ScreenHeader
            title="Review your meal"
            subtitle={
              scanSource === "device"
                ? "Scanned on your phone"
                : scanSource === "api"
                ? "Scanned online"
                : undefined
            }
            onBack={() => {
              setShowReview(false);
              setCart([]);
              setScanImageUri(null);
              setScanImageSize(null);
              setScanSource(null);
              setCapturedUri(null);
              setShowCamera(false);
            }}
            backIcon={X}
            backLabel="Discard this scan"
          />
        }
        footer={logButton}
      >
        {/* Image with bounding box overlays */}
        {scanImageUri && scanImageSize && (
          <View
            className="rounded-md overflow-hidden mb-4 border border-border"
            style={{ width: displayW, height: displayH }}
          >
            <Image
              source={{ uri: scanImageUri }}
              style={{ width: displayW, height: displayH }}
              resizeMode="cover"
              accessibilityLabel="Your meal photo with detected foods outlined"
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
                    { left, top, width: w, height: h, borderColor: color },
                  ]}
                />,
                <View
                  key={`lbl-${item.id}`}
                  pointerEvents="none"
                  style={[
                    styles.bboxLabel,
                    { backgroundColor: color, left, top: Math.max(0, top - 22) },
                  ]}
                >
                  <Text style={styles.bboxLabelText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>,
              ];
            })}
          </View>
        )}

        <Banner
          tone="info"
          message="Check each food and portion below. Use − and + to fix anything that looks wrong."
        />

        {/* Detected items */}
        {cart.map((item, idx) => (
          <Card key={item.id} className="mb-4">
            <View className="flex-row items-center mb-4">
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: item.bbox
                    ? BBOX_COLORS[idx % BBOX_COLORS.length]
                    : colors.mutedForeground,
                }}
              />
              <View className="flex-1 ml-2">
                <Text className="text-body font-bold text-foreground">{item.name}</Text>
                {item.confidence > 0 && (
                  <Text className="text-caption text-muted-foreground">
                    {Math.round(item.confidence * 100)}% sure
                  </Text>
                )}
              </View>
              <IconButton
                icon={Trash2}
                tone="danger"
                accessibilityLabel={`Remove ${item.name}`}
                onPress={() => removeFromCart(item.id)}
              />
            </View>

            {/* Not in food_db.json — nutrients would silently log as 0 */}
            {item.calories === 0 && (
              <Banner
                tone="caution"
                message="Not in the food database — nutrients show as 0. Remove it and add the food manually for accurate totals."
              />
            )}

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Stepper
                  label="Portion"
                  value={`${Math.round(item.portion_g)} g`}
                  onMinus={() => adjustPortion(item.id, -5)}
                  onPlus={() => adjustPortion(item.id, 5)}
                />
              </View>
              <View className="flex-1 ml-2">
                <Stepper
                  label="Servings"
                  value={`×${item.quantity}`}
                  onMinus={() => adjustQuantity(item.id, -1)}
                  onPlus={() => adjustQuantity(item.id, 1)}
                />
              </View>
            </View>

            {/* Nutrient grid (scaled by quantity) */}
            <View className="flex-row flex-wrap -mx-1">
              {[
                { label: "Calories", val: `${Math.round(item.calories * item.quantity)}`, u: "kcal" },
                { label: "Potassium", val: `${Math.round(item.potassium_mg * item.quantity)}`, u: "mg" },
                { label: "Phosphorus", val: `${Math.round(item.phosphorus_mg * item.quantity)}`, u: "mg" },
                { label: "Sodium", val: `${Math.round(item.sodium_mg * item.quantity)}`, u: "mg" },
                { label: "Protein", val: (item.protein_g * item.quantity).toFixed(1), u: "g" },
                { label: "Carbs", val: (item.carbs_g * item.quantity).toFixed(1), u: "g" },
                { label: "Fat", val: (item.fat_g * item.quantity).toFixed(1), u: "g" },
              ].map((n) => (
                <View key={n.label} className="w-1/2 px-1 mb-2">
                  <View className="bg-muted rounded-sm px-3 py-2">
                    <Text className="text-caption text-muted-foreground">{n.label}</Text>
                    <Text className="text-body font-bold text-foreground">
                      {n.val} {n.u}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ))}

        {/* Meal totals */}
        <Card>
          <SectionTitle
            title="This meal in total"
            action={ckdStage ? <StatusBadge level={toStatus(mealRisk.level)} /> : undefined}
          />
          <Text className="text-display font-bold text-foreground">
            {Math.round(totalCal)}
            <Text className="text-body font-normal text-muted-foreground"> kcal</Text>
          </Text>
          <View className="flex-row flex-wrap mt-2">
            {[
              { l: "Potassium", v: `${Math.round(totalK)} mg` },
              { l: "Phosphorus", v: `${Math.round(totalP)} mg` },
              { l: "Sodium", v: `${Math.round(totalNa)} mg` },
              { l: "Protein", v: `${totalPro.toFixed(1)} g` },
            ].map(({ l, v }) => (
              <View key={l} className="w-1/2 py-1">
                <Text className="text-caption text-muted-foreground">{l}</Text>
                <Text className="text-body font-bold text-foreground">{v}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Screen>
    );
  }

  /* ── Main render ──────────────────────────────────── */

  const cartTotal = cart.reduce((a, c) => a + c.calories * c.quantity, 0);

  return (
    <Screen
      header={
        <ScreenHeader
          title="Log a meal"
          subtitle="Take a photo or search for what you ate"
        />
      }
      footer={cart.length > 0 ? logButton : undefined}
    >
      <SegmentedControl
        options={MODE_OPTIONS}
        value={active}
        onChange={setActive}
        className="mb-4"
      />

      {/* ── Scan mode ──────────────────────────────── */}
      {active === "scan" && (
        <Card>
          <View className="items-center mb-6">
            <View className="h-16 w-16 rounded-full bg-primary-soft items-center justify-center mb-4">
              <Camera size={28} color={colors.primary} />
            </View>
            <Text className="text-title font-bold text-foreground text-center">
              Scan your plate
            </Text>
            <Text className="text-body text-muted-foreground text-center mt-2">
              Take a photo and we'll find each food and check it against your limits.
            </Text>
          </View>
          {!modelReady && (
            <Banner
              tone="caution"
              title="Scanning needs internet"
              message="The offline food scanner isn't available on this device, so photos will be checked online instead."
            />
          )}
          <Button onPress={openCamera} icon={Camera} className="mb-4">
            Take a photo
          </Button>
          <Button variant="outline" onPress={pickFromGallery} icon={ImageIcon}>
            Choose from gallery
          </Button>
          <View className="flex-row items-center mt-6">
            <Sun size={20} color={colors.mutedForeground} />
            <Text className="flex-1 text-caption text-muted-foreground ml-2">
              Tip: good light and a photo from above give the best results.
            </Text>
          </View>
        </Card>
      )}

      {/* ── Manual mode ────────────────────────────── */}
      {active === "manual" && (
        <Card>
          <View className="flex-row items-center bg-card rounded-sm border border-input pl-4 mb-4">
            <Search size={20} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={searchFood}
              placeholder="Type a food, e.g. nasi"
              placeholderTextColor={colors.mutedForeground}
              selectionColor={colors.primary}
              accessibilityLabel="Search foods"
              className="flex-1 min-h-[52px] px-3 text-body text-foreground"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <IconButton
                icon={X}
                accessibilityLabel="Clear search"
                onPress={() => {
                  setQuery("");
                  setResults([]);
                }}
              />
            )}
          </View>

          {query.trim().length < 2 && (
            <View>
              <Text className="text-caption font-bold text-muted-foreground mb-2">
                Popular foods
              </Text>
              <View className="flex-row flex-wrap">
                {POPULAR_SEARCHES.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => searchFood(name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${name}`}
                    className="min-h-touch px-4 mr-2 mb-2 rounded-full bg-muted items-center justify-center active:opacity-70"
                  >
                    <Text className="text-body text-foreground">{name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {results.length > 0 && (
            <View>
              <Text className="text-caption font-bold text-muted-foreground mb-2">
                {results.length} result{results.length > 1 ? "s" : ""} — tap to add
              </Text>
              {results.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    addToCart(item);
                    toast(`Added ${item.name}`, "info");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name}, ${Math.round(item.portion_g)} grams, ${Math.round(item.calories)} calories`}
                  className="flex-row items-center bg-muted rounded-sm px-4 py-3 mb-2 active:opacity-70"
                >
                  <View className="flex-1">
                    <Text className="text-body font-bold text-foreground">{item.name}</Text>
                    <Text className="text-caption text-muted-foreground">
                      {Math.round(item.portion_g)} g · {Math.round(item.calories)} kcal
                    </Text>
                  </View>
                  <View className="h-12 px-4 rounded-full bg-primary flex-row items-center">
                    <Plus size={20} color={colors.primaryForeground} strokeWidth={2.5} />
                    <Text className="text-caption font-bold text-primary-foreground ml-1">
                      Add
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {query.trim().length >= 2 && results.length === 0 && (
            <View className="items-center py-6">
              <SearchX size={28} color={colors.mutedForeground} />
              <Text className="text-body font-bold text-foreground mt-2 text-center">
                No foods found for "{query}"
              </Text>
              <Text className="text-caption text-muted-foreground mt-1 text-center">
                Try a shorter or different name, like "rice" or "egg".
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* ── Cart ───────────────────────────────────── */}
      {cart.length > 0 && (
        <Card className="mt-4">
          <SectionTitle
            icon={Utensils}
            title="Your meal"
            action={
              <Text className="text-body font-bold text-foreground">
                {Math.round(cartTotal)} kcal
              </Text>
            }
          />

          {cart.map((item) => (
            <View key={item.id} className="border-t border-border pt-4 mb-4">
              <View className="flex-row items-center mb-2">
                <View className="flex-1">
                  <Text className="text-body font-bold text-foreground">{item.name}</Text>
                  <Text className="text-caption text-muted-foreground">
                    {Math.round(item.calories * item.quantity)} kcal
                  </Text>
                </View>
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  accessibilityLabel={`Remove ${item.name}`}
                  onPress={() => removeFromCart(item.id)}
                />
              </View>
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <Stepper
                    label="Portion"
                    value={`${Math.round(item.portion_g)} g`}
                    onMinus={() => adjustPortion(item.id, -5)}
                    onPlus={() => adjustPortion(item.id, 5)}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Stepper
                    label="Servings"
                    value={`×${item.quantity}`}
                    onMinus={() => adjustQuantity(item.id, -1)}
                    onPlus={() => adjustQuantity(item.id, 1)}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

/* ── Styles (camera sits on a live photo, so it uses fixed colours) ── */

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: tokens.fixed.black },
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
    paddingBottom: 16,
    backgroundColor: tokens.fixed.scrimLight,
  },
  topTitle: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.title[0],
    fontWeight: tokens.fontWeight.bold,
  },
  roundBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.fixed.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  detectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.fixed.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  detectingTitle: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.title[0],
    fontWeight: tokens.fontWeight.bold,
    textAlign: "center",
    marginTop: 24,
  },
  detectingHint: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.body[0],
    textAlign: "center",
    marginTop: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: tokens.fixed.scrim,
  },
  cameraHint: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.body[0],
    textAlign: "center",
    marginBottom: 16,
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideBtn: { width: 72, alignItems: "center" },
  sideBtnText: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.caption[0],
    fontWeight: tokens.fontWeight.bold,
    marginTop: 4,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: tokens.fixed.white,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.fixed.white,
  },
  freezeControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  freezeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.fixed.scrim,
    borderWidth: 2,
    borderColor: tokens.fixed.white,
    minHeight: 56,
    borderRadius: tokens.radius.md,
    gap: 8,
  },
  freezeBtnText: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.body[0],
    fontWeight: tokens.fontWeight.bold,
  },

  // Bounding box overlay styles
  bbox: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 6,
  },
  bboxLabel: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  bboxLabelText: {
    color: tokens.fixed.white,
    fontSize: tokens.fontSize.caption[0],
    fontWeight: tokens.fontWeight.bold,
    flexShrink: 0,
  },
});
