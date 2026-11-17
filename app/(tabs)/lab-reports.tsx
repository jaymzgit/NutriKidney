import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, BackHandler, Image, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  FileText,
  FlaskConical,
  ImageIcon,
  RefreshCw,
  Save,
  ScanLine,
  Sun,
  X,
} from "lucide-react-native";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import SectionTitle from "@/components/SectionTitle";
import Button from "@/components/Button";
import Banner from "@/components/Banner";
import TextField from "@/components/TextField";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/lib/theme";
import {
  LAB_FIELDS,
  fetchLabReports,
  recognizeText,
  saveLabReport,
} from "@/mocks/labReports";
import type { LabReport } from "@/mocks/labReports";

type Step = "home" | "scanning" | "review";
type FieldKey = (typeof LAB_FIELDS)[number]["key"];
type PickedImage = { uri: string; mimeType?: string | null };

const today = () => new Date().toISOString().slice(0, 10);

function formatReportDate(d: string) {
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Scanning animation ─────────────────────────────── */

function ScanningView({ image, onCancel }: { image: PickedImage; onCancel: () => void }) {
  const { colors, reduceMotion } = useTheme();
  const [boxH, setBoxH] = useState(0);
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || boxH === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [line, reduceMotion, boxH]);

  return (
    <View accessibilityLiveRegion="polite">
      <View
        className="rounded-md overflow-hidden border border-border mb-6 bg-muted"
        style={{ height: 320 }}
        onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
      >
        <Image
          source={{ uri: image.uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessibilityLabel="Your lab report photo"
        />
        {!reduceMotion && boxH > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOpacity: 0.8,
              shadowRadius: 8,
              transform: [
                { translateY: line.interpolate({ inputRange: [0, 1], outputRange: [0, boxH - 4] }) },
              ],
            }}
          />
        ) : null}
      </View>
      <View className="flex-row items-center justify-center">
        <ScanLine size={24} color={colors.primary} />
        <Text className="text-title font-bold text-foreground ml-2">Reading your report…</Text>
      </View>
      <Text className="text-body text-muted-foreground text-center mt-2 mb-6">
        We're looking for eGFR, creatinine, potassium and phosphate. This takes a few seconds.
      </Text>
      <Button variant="outline" icon={X} onPress={onCancel}>
        Cancel
      </Button>
    </View>
  );
}

/* ── Screen ─────────────────────────────────────────── */

export default function LabReports() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>("home");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [reportDate, setReportDate] = useState(today());
  const [values, setValues] = useState<Record<FieldKey, string>>({
    egfr: "",
    creatinine: "",
    potassium: "",
    phosphorus: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey | "date", string>>>({});
  const [saving, setSaving] = useState(false);

  const [reports, setReports] = useState<LabReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Ignore OCR results that arrive after the user cancelled.
  const scanToken = useRef(0);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      setReports(await fetchLabReports());
    } catch (e: any) {
      setReportsError(e?.message || "Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const goHome = useCallback(() => {
    scanToken.current += 1;
    setStep("home");
    setScanError(null);
    setErrors({});
  }, []);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step === "home") return false;
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [step, goHome])
  );

  const runOcr = useCallback(async (img: PickedImage) => {
    const token = ++scanToken.current;
    setStep("scanning");
    setScanError(null);
    try {
      const result = await recognizeText(img);
      if (token !== scanToken.current) return;
      const str = (n: number | null) => (n == null ? "" : String(n));
      setValues({
        egfr: str(result.egfr),
        creatinine: str(result.creatinine),
        potassium: str(result.potassium),
        phosphorus: str(result.phosphorus),
      });
      setConfidence(result.confidence);
      setReportDate(today());
      setErrors({});
      setStep("review");
    } catch (e: any) {
      if (token !== scanToken.current) return;
      setScanError(e?.message || "We couldn't read this report.");
    }
  }, []);

  const pick = useCallback(
    async (source: "camera" | "library") => {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Camera access is required to photograph your report.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      }
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const img = { uri: asset.uri, mimeType: asset.mimeType };
      setImage(img);
      runOcr(img);
    },
    [runOcr]
  );

  const handleSave = async () => {
    const nextErrors: typeof errors = {};
    const parsed = {} as Record<FieldKey, number | null>;
    for (const f of LAB_FIELDS) {
      const raw = values[f.key].trim().replace(",", ".");
      if (raw === "") {
        parsed[f.key] = null;
      } else if (isNaN(Number(raw)) || Number(raw) < 0) {
        nextErrors[f.key] = "Please enter a number, e.g. 4.5";
      } else {
        parsed[f.key] = Number(raw);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate.trim())) {
      nextErrors.date = "Use the format YYYY-MM-DD, e.g. 2026-09-26";
    }
    if (LAB_FIELDS.every((f) => values[f.key].trim() === "")) {
      nextErrors.egfr = "Enter at least one result to save";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await saveLabReport({ reportDate: reportDate.trim(), imageUri: image?.uri, ...parsed });
      toast("Lab report saved");
      goHome();
      loadReports();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Scanning ─────────────────────────────────────── */

  if (step === "scanning" && image) {
    return (
      <Screen header={<ScreenHeader title="Scanning report" onBack={goHome} backIcon={X} backLabel="Cancel scan" />}>
        {scanError ? (
          <Card>
            <ErrorState
              title="Couldn't read this report"
              message={`${scanError} You can try again or choose a clearer photo.`}
              onRetry={() => runOcr(image)}
            />
            <Button variant="ghost" icon={ImageIcon} onPress={goHome}>
              Choose another photo
            </Button>
          </Card>
        ) : (
          <ScanningView image={image} onCancel={goHome} />
        )}
      </Screen>
    );
  }

  /* ── Review ───────────────────────────────────────── */

  if (step === "review") {
    return (
      <Screen
        header={
          <ScreenHeader
            title="Check your results"
            onBack={goHome}
            backIcon={X}
            backLabel="Discard these results"
          />
        }
        footer={
          <View>
            <Button icon={Save} onPress={handleSave} loading={saving}>
              Save report
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              className="mt-2"
              disabled={saving}
              onPress={() => image && runOcr(image)}
            >
              Scan again
            </Button>
          </View>
        }
      >
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{ width: "100%", height: 160, borderRadius: 16, marginBottom: 16 }}
            resizeMode="cover"
            accessibilityLabel="Your lab report photo"
          />
        ) : null}

        <Banner
          tone="caution"
          title="Please double-check"
          message={`We read these numbers automatically (${Math.round(
            confidence * 100
          )}% sure). Compare each one with your paper report and fix any mistakes.`}
        />

        <Card>
          <TextField
            label="Report date"
            value={reportDate}
            onChangeText={setReportDate}
            placeholder="YYYY-MM-DD"
            error={errors.date}
          />
          {LAB_FIELDS.map((f, i) => (
            <TextField
              key={f.key}
              label={`${f.label} (${f.unit})`}
              value={values[f.key]}
              onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
              placeholder="Leave blank if not on report"
              keyboardType="decimal-pad"
              hint={f.typical}
              error={errors[f.key]}
              containerClassName={i === LAB_FIELDS.length - 1 ? "mb-0" : ""}
            />
          ))}
        </Card>
      </Screen>
    );
  }

  /* ── Home ─────────────────────────────────────────── */

  return (
    <Screen
      header={
        <ScreenHeader
          title="Lab reports"
          onBack={() => router.navigate("/(tabs)")}
          backLabel="Back to Home"
        />
      }
    >
      <Card className="mb-4">
        <View className="items-center mb-6">
          <View className="h-16 w-16 rounded-full bg-primary-soft items-center justify-center mb-4">
            <FlaskConical size={28} color={colors.primary} />
          </View>
          <Text className="text-title font-bold text-foreground text-center">
            Scan a blood test report
          </Text>
          <Text className="text-body text-muted-foreground text-center mt-2">
            We'll read your eGFR, creatinine, potassium and phosphate so you can keep them in one
            place.
          </Text>
        </View>
        <Button icon={Camera} onPress={() => pick("camera")} className="mb-4">
          Take a photo
        </Button>
        <Button variant="outline" icon={ImageIcon} onPress={() => pick("library")}>
          Choose from gallery
        </Button>
        <View className="flex-row items-center mt-6">
          <Sun size={20} color={colors.mutedForeground} />
          <Text className="flex-1 text-caption text-muted-foreground ml-2">
            Tip: lay the page flat in good light so all the numbers are sharp.
          </Text>
        </View>
      </Card>

      <Card>
        <SectionTitle icon={FileText} title="Your reports" />
        {reportsLoading ? (
          <LoadingState label="Loading your reports…" />
        ) : reportsError ? (
          <ErrorState title="Couldn't load your reports" message={reportsError} onRetry={loadReports} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            message="Scanned reports will appear here so you can see how your results change over time."
          />
        ) : (
          reports.map((r, idx) => (
            <View
              key={r.id}
              className={`py-4 ${idx > 0 ? "border-t border-border" : ""}`}
              accessible
              accessibilityLabel={`Report from ${formatReportDate(r.reportDate)}`}
            >
              <Text className="text-body font-bold text-foreground mb-2">
                {formatReportDate(r.reportDate)}
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {LAB_FIELDS.map((f) => (
                  <View key={f.key} className="w-1/2 px-1 mb-2">
                    <View className="bg-muted rounded-sm px-3 py-2">
                      <Text className="text-caption text-muted-foreground">{f.label}</Text>
                      <Text className="text-body font-bold text-foreground">
                        {r[f.key] ?? "—"}
                        {r[f.key] != null ? (
                          <Text className="text-caption font-normal text-muted-foreground">
                            {" "}
                            {f.unit}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
