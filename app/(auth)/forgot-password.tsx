import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Mail, ArrowLeft } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { useAuth } from "@/lib/AuthContext";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable className="flex-row items-center">
            <ArrowLeft size={12} color="#1A7A55" />
            <Text className="text-primary font-medium text-sm ml-1">
              Back to log in
            </Text>
          </Pressable>
        </Link>
      }
    >
      {sent ? (
        <Text className="text-sm text-foreground text-center">
          If an account exists with that email, you'll receive a password reset
          link shortly.
        </Text>
      ) : (
        <View>
          <TextField
            label="Email address"
            icon={Mail}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />
          <Button onPress={handleSubmit} loading={loading} className="mt-2">
            Send reset link
          </Button>
        </View>
      )}
    </AuthLayout>
  );
}
