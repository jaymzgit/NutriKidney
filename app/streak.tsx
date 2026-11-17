import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Flame, Calendar, Trophy } from "lucide-react-native";
import Screen from "@/components/Screen";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import IconButton from "@/components/IconButton";
import { useTheme } from "@/lib/theme";
import { useMeals } from "@/lib/useMeals";
import { buildMonthGrid, computeStreaks } from "@/lib/streak";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function StreakScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { meals, loading, error } = useMeals();

  const stats = useMemo(() => computeStreaks(meals), [meals]);

  // Calendar starts on the current month; ← → navigate (future months locked).
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, stats.loggedDays),
    [view, stats.loggedDays]
  );

  const now = new Date();
  const atCurrentMonth =
    view.year === now.getFullYear() && view.month === now.getMonth();

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const m = v.month + delta;
      return {
        year: v.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      };
    });

  if (meals.length === 0 && !loading && !error) {
    return (
      <Screen
        header={
          <ScreenHeader
            title="Logging streak"
            subtitle="Days you've logged a meal, in a row"
            onBack={() => router.back()}
          />
        }
      >
        <EmptyState
          icon={Flame}
          title="No streak yet"
          message="Log a meal today — your streak starts now and grows every day you log."
          action={{
            label: "Log a meal",
            icon: Flame,
            onPress: () => router.navigate("/(tabs)/scan"),
          }}
        />
      </Screen>
    );
  }

  const statsCards = [
    { icon: Flame, value: stats.current, label: "current streak" },
    { icon: Trophy, value: stats.longest, label: "longest streak" },
    { icon: Calendar, value: stats.totalDays, label: "total days logged" },
  ];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Logging streak"
          subtitle="Days you've logged a meal, in a row"
          onBack={() => router.back()}
        />
      }
    >
      {error ? (
        <Text className="text-caption text-danger mb-4">{error}</Text>
      ) : null}

      {/* Stats */}
      <View className="flex-row mb-4">
        {statsCards.map(({ icon: Icon, value, label }, i) => (
          <Card
            key={label}
            className={`flex-1 ${i === 0 ? "mr-2" : i === 1 ? "mx-2" : "ml-2"}`}
          >
            <Icon
              size={18}
              color={i === 0 && stats.current > 0 ? colors.caution : colors.mutedForeground}
            />
            <Text className="text-title font-bold text-foreground mt-2">{value}</Text>
            <Text className="text-caption text-muted-foreground">{label}</Text>
          </Card>
        ))}
      </View>

      {/* Today status */}
      <Card className="mb-4">
        {stats.todayLogged ? (
          <Text className="text-body text-foreground">
            ✅ Logged today — your streak is safe. That&apos;s {stats.current}{" "}
            day{stats.current !== 1 ? "s" : ""} straight.
          </Text>
        ) : stats.todayPending ? (
          <Text className="text-body text-foreground">
            🕐 Nothing logged yet today — your {stats.current}-day streak is
            still alive until midnight.
          </Text>
        ) : (
          <Text className="text-body text-foreground">
            Log a meal today to start a new streak.
          </Text>
        )}
      </Card>

      {/* Month calendar */}
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
            className="-ml-2"
          />
          <Text className="text-body font-bold text-foreground">
            {MONTH_NAMES[view.month]} {view.year}
          </Text>
          <IconButton
            icon={ChevronRight}
            accessibilityLabel="Next month"
            onPress={() => shiftMonth(1)}
            disabled={atCurrentMonth}
            className="-mr-2"
          />
        </View>

        {/* Weekday header */}
        <View className="flex-row mb-2">
          {WEEKDAYS.map((d, i) => (
            <View key={`${d}-${i}`} className="flex-1 items-center">
              <Text className="text-caption text-muted-foreground font-bold">{d}</Text>
            </View>
          ))}
        </View>

        {/* Day cells */}
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row mb-1">
            {week.map((cell, ci) => {
              if (!cell) return <View key={ci} className="flex-1" />;
              const bg = cell.logged
                ? colors.primary
                : cell.isToday
                ? colors.cautionSoft
                : colors.muted;
              const fg = cell.logged
                ? colors.primaryForeground
                : cell.isToday
                ? colors.caution
                : colors.mutedForeground;
              return (
                <View key={cell.key} className="flex-1 items-center">
                  <View
                    accessible
                    accessibilityLabel={`${cell.day} ${MONTH_NAMES[view.month]}: ${
                      cell.logged ? "logged" : cell.isFuture ? "upcoming" : "missed"
                    }`}
                    style={{
                      backgroundColor: bg,
                      borderColor: cell.isToday ? colors.caution : "transparent",
                      borderWidth: cell.isToday ? 1.5 : 0,
                      opacity: cell.isFuture ? 0.4 : 1,
                    }}
                    className="w-9 h-9 rounded-md items-center justify-center"
                  >
                    <Text
                      style={{ color: fg }}
                      className="text-caption font-bold"
                    >
                      {cell.day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View className="flex-row flex-wrap mt-3">
          {(
            [
              { c: colors.primary, label: "Logged" },
              { c: colors.cautionSoft, border: colors.caution, label: "Today" },
              { c: colors.muted, label: "Missed" },
            ] as { c: string; label: string; border?: string }[]
          ).map((l) => (
            <View key={l.label} className="flex-row items-center mr-4 mb-1">
              <View
                style={{
                  backgroundColor: l.c,
                  borderColor: l.border ?? "transparent",
                  borderWidth: l.border ? 1.5 : 0,
                }}
                className="w-3 h-3 rounded-sm mr-1.5"
              />
              <Text className="text-caption text-muted-foreground">{l.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text className="text-caption text-muted-foreground">
        A day counts once you log at least one meal. Today stays streak-safe
        until midnight — log before the day ends to keep it going.
      </Text>
    </Screen>
  );
}
