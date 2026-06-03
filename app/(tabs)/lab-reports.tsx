import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, FileText, Upload } from "lucide-react-native";
import Button from "@/components/Button";

export default function LabReports() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 pt-2">
        <View className="flex-row items-center mb-6">
          <FileText size={20} color="#1A7A55" />
          <Text className="text-lg font-bold text-foreground ml-3">
            Lab Reports
          </Text>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-5">
          <Text className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Upload your medical lab reports and our OCR system will extract key
            values like GFR, creatinine, and potassium levels to personalise
            your dietary recommendations.
          </Text>

          <View
            className="items-center py-8 rounded-xl bg-muted/30"
            style={{
              borderWidth: 2,
              borderColor: "#E2E5E8",
              borderStyle: "dashed",
            }}
          >
            <View className="h-16 w-16 bg-primary/10 rounded-2xl items-center justify-center mb-4">
              <FileText size={32} color="#1A7A55" />
            </View>
            <Text className="text-sm font-semibold text-foreground mb-1">
              Upload Lab Report
            </Text>
            <Text className="text-xs text-muted-foreground mb-4">
              Supports photos and PDF documents
            </Text>

            <View className="flex-row">
              <Button variant="outline" disabled className="mr-3">
                <View className="flex-row items-center">
                  <Camera size={16} color="#181F29" />
                  <Text className="text-foreground text-sm font-medium ml-1.5">
                    Take Photo
                  </Text>
                </View>
              </Button>
              <Button variant="outline" disabled>
                <View className="flex-row items-center">
                  <Upload size={16} color="#181F29" />
                  <Text className="text-foreground text-sm font-medium ml-1.5">
                    Upload File
                  </Text>
                </View>
              </Button>
            </View>
          </View>

          <Text className="text-xs text-muted-foreground italic text-center mt-4">
            Lab report scanning will be available in a future update
          </Text>
        </View>

        <View className="bg-card rounded-xl border border-border p-4">
          <Text className="text-sm font-bold text-foreground mb-4">
            Past Reports
          </Text>
          <View className="items-center py-6">
            <Text className="text-sm text-muted-foreground">
              No lab reports uploaded yet
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
