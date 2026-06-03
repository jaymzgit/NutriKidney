import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { useAuth } from "@/lib/AuthContext";

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
    >
      {error ? (
        <View className="mb-4 p-3 rounded-lg bg-destructive/10">
          <Text className="text-destructive text-sm">{error}</Text>
        </View>
      ) : null}
      <TextField
        label="New Password"
        icon={Lock}
        value={newPassword}
        onChangeText={setNewPassword}
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
        Reset password
      </Button>
    </AuthLayout>
  );
}
