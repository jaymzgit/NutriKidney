import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { UserPlus, Mail, Lock } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      setInfo(
        "Account created. Check your email to confirm before logging in."
      );
    } catch (err: any) {
      setError(err?.message || "Registration failed");
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
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <Text className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/(auth)/login" className="text-primary font-medium">
            Log in
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
      {info ? (
        <View className="mb-4 p-3 rounded-lg bg-primary/10">
          <Text className="text-primary text-sm">{info}</Text>
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
        autoComplete="password-new"
      />
      <TextField
        label="Confirm Password"
        icon={Lock}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password-new"
      />
      <Button onPress={handleSubmit} loading={loading} className="mt-2">
        Create account
      </Button>
    </AuthLayout>
  );
}
