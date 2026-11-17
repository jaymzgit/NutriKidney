import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Check, Pencil } from "lucide-react-native";
import { useTheme } from "@/lib/theme";

const ITEM_H = 48;
const VISIBLE = 3;
const PICKER_H = ITEM_H * VISIBLE;

type Props = {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
};

export default function ScrollPicker({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const items: number[] = [];
  for (let v = min; v <= max; v += step) items.push(v);

  const scrollRef = useRef<ScrollView>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  useEffect(() => {
    if (!editing) return;
    const idx = items.indexOf(valueRef.current);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
      }, 50);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    const picked = items[clamped];
    if (picked !== valueRef.current) onChange(picked);
  };

  // Locked view — tap to enter edit mode (prevents accidental changes while scrolling the page)
  if (!editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value} ${unit}`}
        accessibilityHint="Double tap to change"
        className="rounded-md border border-border bg-card overflow-hidden active:opacity-80"
      >
        <View className="flex-row items-center justify-between px-4 pt-4">
          <Text className="text-caption font-bold text-muted-foreground">{label}</Text>
          <Pencil size={16} color={colors.primary} />
        </View>
        <View style={{ height: PICKER_H - 16 }} className="items-center justify-center">
          <Text className="text-display font-bold text-foreground">{value}</Text>
          <Text className="text-caption text-muted-foreground">{unit}</Text>
        </View>
        <View className="bg-muted py-2 items-center">
          <Text className="text-caption font-bold text-primary">Tap to change</Text>
        </View>
      </Pressable>
    );
  }

  // Editing view
  return (
    <View className="rounded-md border border-primary bg-card overflow-hidden">
      <View className="flex-row items-center justify-between pl-4 pt-2">
        <Text className="text-caption font-bold text-muted-foreground">{label}</Text>
        <Pressable
          onPress={() => setEditing(false)}
          accessibilityRole="button"
          accessibilityLabel={`Done, ${value} ${unit}`}
          className="min-h-touch px-4 flex-row items-center"
        >
          <Check size={16} color={colors.primary} strokeWidth={3} />
          <Text className="text-caption font-bold text-primary ml-1">Done</Text>
        </Pressable>
      </View>
      <View style={{ height: PICKER_H }} className="relative">
        <View
          className="absolute left-2 right-2 rounded-sm bg-primary-soft border border-primary"
          style={{ top: pad, height: ITEM_H }}
          pointerEvents="none"
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          contentContainerStyle={{ paddingTop: pad, paddingBottom: pad }}
          nestedScrollEnabled
        >
          {items.map((item) => (
            <View key={item} style={{ height: ITEM_H }} className="items-center justify-center">
              <Text
                className={
                  item === value
                    ? "text-title font-bold text-primary"
                    : "text-body text-muted-foreground"
                }
              >
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
