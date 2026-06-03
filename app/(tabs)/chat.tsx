import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageCircle } from "lucide-react-native";

export default function Chat() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4 pt-2 pb-4">
        <View className="flex-row items-center mb-6">
          <MessageCircle size={20} color="#1A7A55" />
          <Text className="text-lg font-bold text-foreground ml-3">
            CKD Assistant
          </Text>
          <View className="ml-auto bg-primary/10 px-2.5 py-1 rounded-full">
            <Text className="text-xs text-primary font-semibold">
              RAG-powered
            </Text>
          </View>
        </View>

        <View className="flex-1 items-center justify-center bg-card rounded-xl border border-border p-8">
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="h-20 w-20 rounded-2xl bg-primary/10 items-center justify-center mb-5">
              <MessageCircle size={40} color="#1A7A55" />
            </View>
            <Text className="text-base font-bold text-foreground mb-2 text-center">
              Ask me anything about CKD
            </Text>
            <Text className="text-sm text-muted-foreground leading-relaxed text-center max-w-xs mb-6">
              Your AI dietitian assistant — powered by verified CKD dietary
              guidelines. Ask about foods, nutrients, safe recipes, and more.
            </Text>

            <View className="w-full mb-6">
              {[
                "Is banana safe for Stage 3 CKD?",
                "How much protein should I eat daily?",
                "What Malaysian foods are low in potassium?",
              ].map((q) => (
                <View key={q} className="bg-muted rounded-xl px-4 py-3 mb-2">
                  <Text className="text-sm text-muted-foreground">"{q}"</Text>
                </View>
              ))}
            </View>

            <Text className="text-xs text-muted-foreground italic text-center">
              AI chat will be available in a future update
            </Text>
          </ScrollView>
        </View>

        <View className="mt-4 flex-row items-center">
          <TextInput
            editable={false}
            placeholder="Ask a question about CKD..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-12 px-4 rounded-xl bg-card border border-border text-sm text-foreground"
          />
          <Pressable
            disabled
            className="h-12 w-12 ml-2 rounded-xl bg-primary items-center justify-center opacity-40"
          >
            <MessageCircle size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
