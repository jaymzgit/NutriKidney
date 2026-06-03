import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { LogIn, Mail, Lock } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <Text className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/(auth)/register" className="text-primary font-medium">
            Create one
          </Link>
        </Text>
      }
    >
      <Button variant="outline" className="mb-6" onPress={handleGoogle}>
        <View className="flex-row items-center">
          <GoogleIcon size={20} />
          <Text className="text-sm font-medium text-foreground ml-2">
            Continue with Google
          </Text>
        </View>
      </Button>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-3 text-xs uppercase text-muted-foreground">or</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      {error ? (
        <View className="mb-4 p-3 rounded-lg bg-destructive/10">
          <Text className="text-destructive text-sm">{error}</Text>
        </View>
      ) : null}

      <TextField
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <TextField
        label="Password"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
        rightSlot={
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text className="text-xs text-primary">Forgot password?</Text>
            </Pressable>
          </Link>
        }
      />
      <Button onPress={handleSubmit} loading={loading} className="mt-2">
        Log in
      </Button>
    </AuthLayout>
  );
}
