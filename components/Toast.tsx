import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertOctagon, CheckCircle2, Info } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

type Tone = "success" | "danger" | "info";
type ToastData = { id: number; message: string; tone: Tone };

const ToastContext = createContext<((message: string, tone?: Tone) => void) | undefined>(
  undefined
);

const DURATION_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const idRef = useRef(0);

  const show = useCallback((message: string, tone: Tone = "success") => {
    idRef.current += 1;
    setToast({ id: idRef.current, message, tone });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  const hide = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start(onDone);
  }, [anim, onDone, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
    }
    const t = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(t);
  }, [anim, hide, reduceMotion]);

  const Icon = { success: CheckCircle2, danger: AlertOctagon, info: Info }[toast.tone];
  const iconColor = { success: colors.primary, danger: colors.danger, info: colors.info }[
    toast.tone
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16 }}
    >
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
        }}
      >
        <Pressable
          onPress={hide}
          accessibilityRole="alert"
          accessibilityHint="Tap to dismiss"
          className="flex-row items-center bg-card border border-border rounded-md px-4 py-4 self-center w-full max-w-[600px]"
          style={{
            shadowColor: colors.shadow,
            shadowOpacity: 0.18,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Icon size={24} color={iconColor} strokeWidth={2.25} />
          <Text className="flex-1 ml-3 text-body font-bold text-foreground">
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
