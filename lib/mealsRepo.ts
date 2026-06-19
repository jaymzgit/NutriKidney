/**
 * Direct-to-Supabase meal logging.
 * Bypasses backend — relies on RLS policies on meal_logs / meal_items.
 */

import { supabase } from "./supabase";

export type NewMealItem = {
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

export type CreateMealInput = {
  method: "scan" | "voice" | "manual";
  risk_level?: "safe" | "caution" | "danger" | null;
  notes?: string | null;
  items: NewMealItem[];
};

export type FetchedMealItem = {
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

export type FetchedMeal = {
  id: string;
  method: string;
  risk_level: string | null;
  notes: string | null;
  logged_at: string;
  meal_items: FetchedMealItem[];
  total_calories: number;
  total_potassium: number;
  total_phosphorus: number;
  total_sodium: number;
  total_protein: number;
};

export async function createMeal(input: CreateMealInput): Promise<string> {
  if (input.items.length === 0) throw new Error("Meal needs at least one item");

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not signed in");
  const user_id = userData.user.id;

  const now = new Date().toISOString();

  const { data: meal, error: mealErr } = await supabase
    .from("meal_logs")
    .insert({
      user_id,
      method: input.method,
      risk_level: input.risk_level ?? null,
      notes: input.notes ?? null,
      logged_at: now,
    })
    .select("id")
    .single();

  if (mealErr || !meal) {
    throw new Error(mealErr?.message || "Failed to create meal log");
  }

  const meal_id = meal.id as string;

  const itemsRows = input.items.map((it) => ({
    meal_id,
    food_name: it.food_name,
    portion_g: it.portion_g,
    calories: it.calories,
    potassium_mg: it.potassium_mg,
    phosphorus_mg: it.phosphorus_mg,
    sodium_mg: it.sodium_mg,
    protein_g: it.protein_g,
    carbs_g: it.carbs_g,
    fat_g: it.fat_g,
    confidence: it.confidence,
    logged_at: now,
  }));

  const { error: itemsErr } = await supabase
    .from("meal_items")
    .insert(itemsRows);

  if (itemsErr) {
    // Best-effort rollback
    await supabase.from("meal_logs").delete().eq("id", meal_id);
    throw new Error(itemsErr.message || "Failed to insert meal items");
  }

  return meal_id;
}

export async function deleteMeal(meal_id: string): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not signed in");
  const user_id = userData.user.id;

  // Verify ownership before delete
  const { data: check } = await supabase
    .from("meal_logs")
    .select("id")
    .eq("id", meal_id)
    .eq("user_id", user_id)
    .single();
  if (!check) throw new Error("Meal not found");

  await supabase.from("meal_items").delete().eq("meal_id", meal_id);
  const { error } = await supabase.from("meal_logs").delete().eq("id", meal_id);
  if (error) throw new Error(error.message);
}

export async function fetchMeals(): Promise<FetchedMeal[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not signed in");
  const user_id = userData.user.id;

  const { data, error } = await supabase
    .from("meal_logs")
    .select(
      "id, method, risk_level, notes, logged_at, meal_items(id, food_name, portion_g, calories, potassium_mg, phosphorus_mg, sodium_mg, protein_g, carbs_g, fat_g, confidence)"
    )
    .eq("user_id", user_id)
    .order("logged_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const items: FetchedMealItem[] = row.meal_items ?? [];
    return {
      id: row.id,
      method: row.method,
      risk_level: row.risk_level ?? null,
      notes: row.notes ?? null,
      logged_at: row.logged_at,
      meal_items: items,
      total_calories: items.reduce((a, i) => a + (i.calories || 0), 0),
      total_potassium: items.reduce((a, i) => a + (i.potassium_mg || 0), 0),
      total_phosphorus: items.reduce((a, i) => a + (i.phosphorus_mg || 0), 0),
      total_sodium: items.reduce((a, i) => a + (i.sodium_mg || 0), 0),
      total_protein: items.reduce((a, i) => a + (i.protein_g || 0), 0),
    };
  });
}
