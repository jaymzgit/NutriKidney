import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { rem, useColorScheme } from "nativewind";
import tokens from "@/theme/tokens";

export type ThemePreference = "system" | "light" | "dark";
export type Palette = typeof tokens.palettes.light;

const STORAGE_KEY = "theme_preference";
const TEXT_SCALE_KEY = "text_scale";

type ThemeCtx = {
  /** What the user picked in Profile → Appearance. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** The scheme actually on screen. */
  scheme: "light" | "dark";
  colors: Palette;
  /** Soft, diffuse card shadow (Airbnb-style) (flat in dark mode — borders carry edges). */
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  /** Text size multiplier from Profile → Display (1 = default). */
  textScale: number;
  setTextScale: (s: number) => void;
  /** OS "reduce motion" setting — skip non-essential animation when true. */
  reduceMotion: boolean;
};

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textScale, setScale] = useState(1);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") {
          setPref(v);
          setColorScheme(v);
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(TEXT_SCALE_KEY)
      .then((v) => {
        const n = Number(v);
        if (v && tokens.textScales.some((o) => o.value === n)) setScale(n);
      })
      .catch(() => {});

    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub.remove();
  }, [setColorScheme]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPref(p);
      setColorScheme(p);
      AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
    },
    [setColorScheme]
  );

  const setTextScale = useCallback((s: number) => {
    setScale(s);
    AsyncStorage.setItem(TEXT_SCALE_KEY, String(s)).catch(() => {});
  }, []);

  // Every className size (text, padding, heights) is in rem, so this zooms the UI.
  useEffect(() => {
    rem.set(tokens.remBase * textScale);
  }, [textScale]);

  const scheme = colorScheme === "dark" ? "dark" : "light";
  const colors = tokens.palettes[scheme];

  // Match the native root view so screen transitions never flash white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const value = useMemo<ThemeCtx>(
    () => ({
      preference,
      setPreference,
      scheme,
      colors,
      shadow: {
        shadowColor: colors.shadow,
        shadowOpacity: scheme === "dark" ? 0 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: scheme === "dark" ? 0 : 2,
      },
      textScale,
      setTextScale,
      reduceMotion,
    }),
    [preference, setPreference, scheme, colors, textScale, setTextScale, reduceMotion]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

export { tokens };
