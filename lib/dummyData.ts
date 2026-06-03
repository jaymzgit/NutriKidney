import type { Meal } from "@/components/MealCard";

function isoAt(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

type DummyMealItem = {
  food_name: string;
  portion_g: number;
  calories: number;
  potassium: number;
  phosphorus: number;
  sodium: number;
  protein: number;
};

type DummyMeal = Omit<Meal, "meal_items"> & { meal_items: DummyMealItem[] };

const rawMeals: DummyMeal[] = [
  {
    id: "m-today-1",
    logged_at: isoAt(0, 8, 15),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      {
        food_name: "Rolled oats",
        portion_g: 60,
        calories: 230,
        potassium: 220,
        phosphorus: 180,
        sodium: 5,
        protein: 8,
      },
      {
        food_name: "Blueberries",
        portion_g: 80,
        calories: 46,
        potassium: 60,
        phosphorus: 10,
        sodium: 1,
        protein: 0.6,
      },
      {
        food_name: "Almond milk",
        portion_g: 200,
        calories: 30,
        potassium: 40,
        phosphorus: 20,
        sodium: 65,
        protein: 1,
      },
    ],
  },
  {
    id: "m-today-2",
    logged_at: isoAt(0, 13, 5),
    method: "voice",
    risk_level: "caution",
    meal_items: [
      {
        food_name: "White rice",
        portion_g: 250,
        calories: 325,
        potassium: 90,
        phosphorus: 110,
        sodium: 3,
        protein: 6,
      },
      {
        food_name: "Grilled chicken breast",
        portion_g: 120,
        calories: 198,
        potassium: 320,
        phosphorus: 220,
        sodium: 380,
        protein: 36,
      },
      {
        food_name: "Stir-fried kangkung",
        portion_g: 100,
        calories: 60,
        potassium: 310,
        phosphorus: 50,
        sodium: 420,
        protein: 3,
      },
      {
        food_name: "Soy sauce",
        portion_g: 10,
        calories: 8,
        potassium: 35,
        phosphorus: 14,
        sodium: 880,
        protein: 1,
      },
    ],
  },
  {
    id: "m-today-3",
    logged_at: isoAt(0, 16, 30),
    method: "manual",
    risk_level: "danger",
    meal_items: [
      {
        food_name: "Banana",
        portion_g: 120,
        calories: 105,
        potassium: 425,
        phosphorus: 26,
        sodium: 1,
        protein: 1.3,
      },
      {
        food_name: "Mixed nuts",
        portion_g: 50,
        calories: 290,
        potassium: 340,
        phosphorus: 240,
        sodium: 95,
        protein: 9,
      },
      {
        food_name: "Dark chocolate",
        portion_g: 40,
        calories: 240,
        potassium: 280,
        phosphorus: 130,
        sodium: 10,
        protein: 3,
      },
    ],
  },
  {
    id: "m-yesterday-1",
    logged_at: isoAt(1, 19, 0),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      {
        food_name: "Steamed fish",
        portion_g: 150,
        calories: 180,
        potassium: 280,
        phosphorus: 200,
        sodium: 90,
        protein: 32,
      },
      {
        food_name: "White rice",
        portion_g: 200,
        calories: 260,
        potassium: 72,
        phosphorus: 88,
        sodium: 2,
        protein: 5,
      },
    ],
  },
  {
    id: "m-2days-1",
    logged_at: isoAt(2, 12, 30),
    method: "manual",
    risk_level: "caution",
    meal_items: [
      {
        food_name: "Tofu",
        portion_g: 150,
        calories: 110,
        potassium: 180,
        phosphorus: 140,
        sodium: 12,
        protein: 12,
      },
      {
        food_name: "Brown rice",
        portion_g: 180,
        calories: 220,
        potassium: 150,
        phosphorus: 160,
        sodium: 5,
        protein: 5,
      },
    ],
  },
];

function withTotals(m: DummyMeal): Meal {
  const t = m.meal_items.reduce(
    (acc, it) => ({
      cal: acc.cal + it.calories,
      k: acc.k + it.potassium,
      p: acc.p + it.phosphorus,
      na: acc.na + it.sodium,
      pro: acc.pro + it.protein,
    }),
    { cal: 0, k: 0, p: 0, na: 0, pro: 0 }
  );
  return {
    ...m,
    total_calories: Math.round(t.cal),
    total_potassium: Math.round(t.k),
    total_phosphorus: Math.round(t.p),
    total_sodium: Math.round(t.na),
    total_protein: Math.round(t.pro * 10) / 10,
    meal_items: m.meal_items as unknown as Meal["meal_items"],
  };
}

export const dummyMeals: Meal[] = rawMeals.map(withTotals);
