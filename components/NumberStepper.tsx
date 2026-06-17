import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

type Props = {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  label: string;
  compact?: boolean;
};

export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  compact,
}: Props) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(valueRef.current + delta, max));
    onChangeRef.current(next);
  };

  const startRepeat = (delta: number) => {
    adjust(delta);
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => adjust(delta), 80);
    }, 400);
  };

  const stopRepeat = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  useEffect(() => stopRepeat, []);

  const btnSize = compact ? "h-9 w-9" : "h-12 w-12";
  const iconSize = compact ? 16 : 22;
  const numText = compact ? "text-2xl" : "text-4xl";
  const unitText = compact ? "text-xs" : "text-sm";
  const pad = compact ? "px-3 py-3" : "px-4 py-5";

  return (
    <View>
      <Text className="text-xs font-medium text-muted-foreground mb-2">
        {label}
      </Text>
      <View className={`rounded-2xl border border-border bg-muted/50 ${pad}`}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPressIn={() => startRepeat(-step)}
            onPressOut={stopRepeat}
            className={`${btnSize} rounded-full bg-primary/10 items-center justify-center`}
          >
            <Minus size={iconSize} color="#1A7A55" strokeWidth={2.5} />
          </Pressable>
          <View className="items-center flex-1">
            <Text className={`${numText} font-bold text-foreground leading-none`}>
              {value}
            </Text>
            <Text className={`${unitText} text-muted-foreground mt-0.5`}>{unit}</Text>
          </View>
          <Pressable
            onPressIn={() => startRepeat(step)}
            onPressOut={stopRepeat}
            className={`${btnSize} rounded-full bg-primary/10 items-center justify-center`}
          >
            <Plus size={iconSize} color="#1A7A55" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
