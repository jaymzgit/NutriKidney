import { useState } from "react";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import Banner from "@/components/Banner";
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
      subtitle="Choose a new password for your account"
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      <TextField
        label="New password"
        icon={Lock}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="New password"
        secureTextEntry
        autoComplete="password-new"
      />
      <TextField
        label="Confirm new password"
        icon={Lock}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Type it again"
        secureTextEntry
        autoComplete="password-new"
      />
      <Button onPress={handleSubmit} loading={loading} className="mt-2">
        Save new password
      </Button>
    </AuthLayout>
  );
}
