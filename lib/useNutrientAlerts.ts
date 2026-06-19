import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getLimitsForStage } from "@/lib/ckdLimits";
import { useMeals } from "@/lib/useMeals";
import type { NutrientAlertData } from "@/components/NutrientAlert";

export function useNutrientAlerts() {
  const { user } = useAuth();
  const ckdStage = user?.ckd_stage ?? null;
  const weightKg = user?.weight_kg ?? null;
  const limits = getLimitsForStage(ckdStage, weightKg);
  const { meals } = useMeals();

  const todayMeals = useMemo(() => {
    const today = new Date().toDateString();
    return meals.filter(
      (m) => new Date(m.logged_at).toDateString() === today
    );
  }, [meals]);

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, meal) => ({
        potassium: acc.potassium + (meal.total_potassium || 0),
        phosphorus: acc.phosphorus + (meal.total_phosphorus || 0),
        sodium: acc.sodium + (meal.total_sodium || 0),
        protein: acc.protein + (meal.total_protein || 0),
      }),
      { potassium: 0, phosphorus: 0, sodium: 0, protein: 0 }
    );
  }, [todayMeals]);

  const nutrientAlerts = useMemo<NutrientAlertData[]>(() => {
    if (!ckdStage) return [];
    const checks: NutrientAlertData[] = [
      { key: "potassium", label: "Potassium", unit: "mg", total: totals.potassium, limit: limits.potassium },
      { key: "phosphorus", label: "Phosphorus", unit: "mg", total: totals.phosphorus, limit: limits.phosphorus },
      { key: "sodium", label: "Sodium", unit: "mg", total: totals.sodium, limit: limits.sodium },
      { key: "protein", label: "Protein", unit: "g", total: totals.protein, limit: limits.protein },
    ];
    return checks
      .filter((c) => c.total > c.limit)
      .map((c) => {
        let topItem: string | null = null;
        let topVal = 0;
        todayMeals.forEach((meal) => {
          meal.meal_items?.forEach((item: any) => {
            const v = item[c.key] || 0;
            if (v > topVal) {
              topVal = v;
              topItem = item.food_name;
            }
          });
        });
        return { ...c, topItem, topVal };
      });
  }, [totals, limits, ckdStage, todayMeals]);

  return { nutrientAlerts, ckdStage };
}
