import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Meal } from "@/components/MealCard";

type ApiMealItem = {
  id: string;
  food_name: string;
  portion_g: number;
  calories: number;
  potassium_mg: number;
  phosphorus_mg: number;
  sodium_mg: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
};

type ApiMeal = {
  id: string;
  method: string;
  risk_level: string | null;
  notes: string | null;
  logged_at: string;
  meal_items: ApiMealItem[];
  total_calories: number;
  total_potassium: number;
  total_phosphorus: number;
  total_sodium: number;
  total_protein: number;
};

function normalize(m: ApiMeal): Meal {
  return {
    id: m.id,
    method: m.method as Meal["method"],
    risk_level: m.risk_level as Meal["risk_level"],
    notes: m.notes ?? undefined,
    logged_at: m.logged_at,
    total_calories: m.total_calories,
    total_potassium: m.total_potassium,
    total_phosphorus: m.total_phosphorus,
    total_sodium: m.total_sodium,
    total_protein: m.total_protein,
    meal_items: m.meal_items.map((i) => ({
      food_name: i.food_name,
      portion_g: i.portion_g,
      calories: i.calories,
      potassium: i.potassium_mg,
      phosphorus: i.phosphorus_mg,
      sodium: i.sodium_mg,
      protein: i.protein_g,
    })),
  };
}

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiMeal[]>("/logs/meals");
      setMeals(data.map(normalize));
    } catch (e: any) {
      setError(e?.message || "Failed to load meals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  return { meals, loading, error, refetch: fetchMeals };
}
