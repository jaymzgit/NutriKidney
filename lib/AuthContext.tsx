import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type AppUser = User & {
  full_name?: string | null;
  ckd_stage?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  gender?: string | null;
  has_diabetes?: boolean;
  has_hypertension?: boolean;
  activity_level?: string | null;
  dietary_preference?: string | null;
  food_allergies?: string | null;
  latest_egfr?: number | null;
  diagnosis_date?: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: AppUser | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (patch: Partial<AppUser>) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

function decorateUser(u: User | null | undefined): AppUser | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  return {
    ...u,
    full_name: meta.full_name ?? meta.name ?? null,
    ckd_stage: meta.ckd_stage != null ? String(meta.ckd_stage) : null,
    weight_kg: meta.weight_kg ?? null,
    height_cm: meta.height_cm ?? null,
    age: meta.age ?? null,
    gender: meta.gender ?? null,
    has_diabetes: meta.has_diabetes ?? false,
    has_hypertension: meta.has_hypertension ?? false,
    activity_level: meta.activity_level ?? null,
    dietary_preference: meta.dietary_preference ?? null,
    food_allergies: meta.food_allergies ?? null,
    latest_egfr: meta.latest_egfr ?? null,
    diagnosis_date: meta.diagnosis_date ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL("/auth-callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Failed to start Google OAuth");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      throw new Error("Google sign-in cancelled");
    }
    const url = new URL(result.url);
    const params = new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.search
    );
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) throw setErr;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const redirectTo = Linking.createURL("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (patch: Partial<AppUser>) => {
    const { error } = await supabase.auth.updateUser({ data: patch });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: decorateUser(session?.user),
      isLoadingAuth,
      isAuthenticated: !!session,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      logout,
    }),
    [
      session,
      isLoadingAuth,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
