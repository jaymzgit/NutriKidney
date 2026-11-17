import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Mail, MailCheck, ArrowLeft } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/theme";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const { colors } = useTheme();
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
      subtitle="We'll email you a link to set a new password"
      footer={
        <Link href="/(auth)/login" asChild>
          <Button variant="ghost" icon={ArrowLeft}>
            Back to log in
          </Button>
        </Link>
      }
    >
      {sent ? (
        <View className="items-center" accessibilityLiveRegion="polite">
          <View className="h-14 w-14 rounded-full bg-primary-soft items-center justify-center mb-4">
            <MailCheck size={28} color={colors.primary} />
          </View>
          <Text className="text-title font-bold text-foreground text-center mb-2">
            Check your email
          </Text>
          <Text className="text-body text-muted-foreground text-center">
            If an account exists with that email, you'll receive a password reset
            link shortly.
          </Text>
        </View>
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
