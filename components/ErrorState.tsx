import { CloudOff, RefreshCw } from "lucide-react-native";
import EmptyState from "./EmptyState";

export default function ErrorState({
  title = "Something went wrong",
  message = "Please check your internet connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={CloudOff}
      tone="danger"
      title={title}
      message={message}
      action={onRetry ? { label: "Try again", onPress: onRetry, icon: RefreshCw } : undefined}
    />
  );
}
