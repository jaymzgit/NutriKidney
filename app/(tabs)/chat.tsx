import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { AlertCircle, RefreshCw, RotateCcw, Send, Sparkles } from "lucide-react-native";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import IconButton from "@/components/IconButton";
import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/theme";
import {
  ASSISTANT_GREETING,
  SUGGESTED_QUESTIONS,
  createUserMessage,
  sendChatMessage,
} from "@/mocks/chat";
import type { ChatMessage } from "@/mocks/chat";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function AssistantAvatar() {
  const { colors } = useTheme();
  return (
    <View className="h-10 w-10 rounded-full bg-primary-soft items-center justify-center mr-2 mt-1">
      <Sparkles size={20} color={colors.primary} />
    </View>
  );
}

function CitationChips({ citations }: { citations: NonNullable<ChatMessage["citations"]> }) {
  return (
    <View className="flex-row flex-wrap mt-2" accessibilityLabel="Sources">
      {citations.map((c) => (
        <View
          key={c.ref}
          className="bg-primary-soft border border-border rounded-full px-2.5 py-1 mr-1.5 mb-1"
          accessible
          accessibilityLabel={`Source ${c.ref}: ${c.source}${c.page ? `, page ${c.page}` : ""}`}
        >
          <Text className="text-caption text-primary" numberOfLines={1}>
            [{c.ref}] {c.source}
            {c.page ? ` p.${c.page}` : ""}
            {c.heading ? ` · ${c.heading}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View
      className={`flex-row mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      accessible
      accessibilityLabel={`${isUser ? "You" : "Assistant"} said: ${message.text}`}
    >
      {!isUser ? <AssistantAvatar /> : null}
      <View className="max-w-[85%]">
        <View
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? "bg-primary rounded-br-sm"
              : "bg-card border border-border rounded-bl-sm"
          }`}
        >
          <Text
            className={`text-body ${isUser ? "text-primary-foreground" : "text-foreground"}`}
            selectable
          >
            {message.text}
          </Text>
          {!isUser && message.citations?.length ? (
            <CitationChips citations={message.citations} />
          ) : null}
        </View>
        <Text
          className={`text-caption text-muted-foreground mt-1 ${isUser ? "text-right" : ""}`}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const { colors, reduceMotion } = useTheme();
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.stagger(
        160,
        dots.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [dots, reduceMotion]);

  return (
    <View
      className="flex-row mb-4"
      accessible
      accessibilityLabel="Assistant is typing"
      accessibilityLiveRegion="polite"
    >
      <AssistantAvatar />
      <View className="flex-row items-center bg-card border border-border rounded-lg rounded-bl-sm px-4 py-4">
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              marginHorizontal: 3,
              backgroundColor: colors.mutedForeground,
              opacity: reduceMotion ? 1 : d,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [greetingAt] = useState(() => new Date().toISOString());

  const request = useCallback(
    async (userMsg: ChatMessage, history: ChatMessage[]) => {
      setFailedId(null);
      setSending(true);
      try {
        const reply = await sendChatMessage(userMsg.text, history, {
          ckdStage: user?.ckd_stage,
        });
        setMessages((prev) => [...prev, reply]);
      } catch {
        setFailedId(userMsg.id);
      } finally {
        setSending(false);
      }
    },
    [user?.ckd_stage]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const userMsg = createUserMessage(trimmed);
      const history = messages;
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      request(userMsg, history);
    },
    [messages, request, sending]
  );

  const retry = () => {
    const idx = messages.findIndex((m) => m.id === failedId);
    if (idx < 0) return;
    request(messages[idx], messages.slice(0, idx));
  };

  const clearChat = () =>
    Alert.alert("Start a new chat?", "This clears the current conversation.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New chat",
        onPress: () => {
          setMessages([]);
          setFailedId(null);
        },
      },
    ]);

  const canSend = input.trim().length > 0 && !sending;

  return (
    <Screen
      scroll={false}
      header={
        <ScreenHeader
          title="Diet assistant"
          subtitle="General guidance only — not medical advice"
          right={
            messages.length > 0 ? (
              <IconButton
                icon={RotateCcw}
                accessibilityLabel="Start a new chat"
                onPress={clearChat}
                disabled={sending}
              />
            ) : undefined
          }
        />
      }
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Bubble
          message={{
            id: "greeting",
            role: "assistant",
            text: ASSISTANT_GREETING,
            createdAt: greetingAt,
          }}
        />

        {messages.length === 0 ? (
          <View className="mt-2">
            <Text className="text-caption font-bold text-muted-foreground mb-2">
              Try asking
            </Text>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                accessibilityRole="button"
                className="min-h-touch bg-card border border-border rounded-md px-4 py-3 mb-2 active:opacity-70"
              >
                <Text className="text-body text-foreground">{q}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((m) => (
          <View key={m.id}>
            <Bubble message={m} />
            {m.id === failedId ? (
              <View className="items-end mb-4 -mt-2">
                <View className="flex-row items-center mb-2">
                  <AlertCircle size={16} color={colors.danger} />
                  <Text className="text-caption font-bold text-danger ml-1">
                    Not sent — check your connection
                  </Text>
                </View>
                <Button variant="outline" size="sm" icon={RefreshCw} onPress={retry}>
                  Try again
                </Button>
              </View>
            ) : null}
          </View>
        ))}

        {sending ? <TypingIndicator /> : null}
      </ScrollView>

      {/* Composer */}
      <View className="flex-row items-end px-4 pt-2 pb-4 border-t border-border bg-background">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your question…"
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          accessibilityLabel="Your question"
          multiline
          className="flex-1 min-h-[52px] rounded-md bg-card border border-input px-4 py-3 text-body text-foreground"
          style={{ maxHeight: 128, textAlignVertical: "center" }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          className={`h-12 w-12 ml-2 rounded-full items-center justify-center bg-primary ${
            canSend ? "" : "opacity-40"
          }`}
        >
          <Send size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </Screen>
  );
}
