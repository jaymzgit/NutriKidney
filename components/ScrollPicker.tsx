import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const ITEM_H = 44;
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

  // Locked view — tap to enter edit mode
  if (!editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        className="rounded-2xl border border-border bg-muted/50 overflow-hidden"
      >
        <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
          <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
          <Text className="text-[10px] text-muted-foreground">Tap to edit</Text>
        </View>
        <View style={{ height: PICKER_H }} className="items-center justify-center">
          <Text className="text-2xl font-bold text-muted-foreground/50">
            {value}
          </Text>
          <Text className="text-xs text-muted-foreground/50 mt-1">{unit}</Text>
        </View>
      </Pressable>
    );
  }

  // Editing view
  return (
    <View className="rounded-2xl border border-primary bg-muted/50 overflow-hidden">
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
        <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
        <Pressable onPress={() => setEditing(false)}>
          <Text className="text-xs font-semibold text-primary">
            {value} {unit} Done
          </Text>
        </Pressable>
      </View>
      <View style={{ height: PICKER_H }} className="relative">
        <View
          className="absolute left-3 right-3 rounded-lg bg-primary/10 border border-primary"
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
                className={`font-bold ${
                  item === value ? "text-xl text-primary" : "text-base text-muted-foreground/40"
                }`}
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
