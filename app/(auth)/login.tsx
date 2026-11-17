import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { LogIn, Mail, Lock, UserPlus } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import GoogleIcon from "@/components/GoogleIcon";
import Banner from "@/components/Banner";
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
      subtitle="Log in to track your kidney-friendly meals"
      footer={
        <View className="w-full items-center">
          <Text className="text-body text-muted-foreground mb-2">
            New to NutriKidney?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Button variant="outline" icon={UserPlus} className="self-stretch">
              Create an account
            </Button>
          </Link>
        </View>
      }
    >
      {error ? <Banner tone="danger" message={error} /> : null}

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
        placeholder="Your password"
        secureTextEntry
        autoComplete="password"
        containerClassName="mb-2"
      />
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable
          accessibilityRole="link"
          className="min-h-touch justify-center self-end mb-4"
        >
          <Text className="text-body font-bold text-primary">Forgot password?</Text>
        </Pressable>
      </Link>

      <Button onPress={handleSubmit} loading={loading}>
        Log in
      </Button>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-4 text-caption text-muted-foreground">or</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <Button variant="outline" onPress={handleGoogle}>
        <GoogleIcon size={20} />
        <Text className="text-body font-bold text-foreground ml-2">
          Continue with Google
        </Text>
      </Button>
    </AuthLayout>
  );
}
