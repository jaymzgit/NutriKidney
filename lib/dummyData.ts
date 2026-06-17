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
  // ── Today ──
  {
    id: "m-today-1",
    logged_at: isoAt(0, 8, 15),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Rolled oats", portion_g: 60, calories: 230, potassium: 220, phosphorus: 180, sodium: 5, protein: 8 },
      { food_name: "Blueberries", portion_g: 80, calories: 46, potassium: 60, phosphorus: 10, sodium: 1, protein: 0.6 },
      { food_name: "Almond milk", portion_g: 200, calories: 30, potassium: 40, phosphorus: 20, sodium: 65, protein: 1 },
    ],
  },
  {
    id: "m-today-2",
    logged_at: isoAt(0, 13, 5),
    method: "voice",
    risk_level: "caution",
    meal_items: [
      { food_name: "White rice", portion_g: 250, calories: 325, potassium: 90, phosphorus: 110, sodium: 3, protein: 6 },
      { food_name: "Grilled chicken breast", portion_g: 120, calories: 198, potassium: 320, phosphorus: 220, sodium: 380, protein: 36 },
      { food_name: "Stir-fried kangkung", portion_g: 100, calories: 60, potassium: 310, phosphorus: 50, sodium: 420, protein: 3 },
      { food_name: "Soy sauce", portion_g: 10, calories: 8, potassium: 35, phosphorus: 14, sodium: 880, protein: 1 },
    ],
  },
  {
    id: "m-today-3",
    logged_at: isoAt(0, 16, 30),
    method: "manual",
    risk_level: "danger",
    meal_items: [
      { food_name: "Banana", portion_g: 120, calories: 105, potassium: 425, phosphorus: 26, sodium: 1, protein: 1.3 },
      { food_name: "Mixed nuts", portion_g: 50, calories: 290, potassium: 340, phosphorus: 240, sodium: 95, protein: 9 },
      { food_name: "Dark chocolate", portion_g: 40, calories: 240, potassium: 280, phosphorus: 130, sodium: 10, protein: 3 },
    ],
  },

  // ── Yesterday ──
  {
    id: "m-y-1",
    logged_at: isoAt(1, 7, 45),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Roti canai", portion_g: 100, calories: 300, potassium: 60, phosphorus: 65, sodium: 380, protein: 7 },
      { food_name: "Teh tarik", portion_g: 250, calories: 120, potassium: 180, phosphorus: 100, sodium: 50, protein: 4 },
    ],
  },
  {
    id: "m-y-2",
    logged_at: isoAt(1, 12, 30),
    method: "voice",
    risk_level: "caution",
    meal_items: [
      { food_name: "Nasi lemak", portion_g: 300, calories: 520, potassium: 260, phosphorus: 180, sodium: 680, protein: 14 },
      { food_name: "Fried egg", portion_g: 50, calories: 90, potassium: 70, phosphorus: 100, sodium: 170, protein: 6 },
      { food_name: "Sambal", portion_g: 30, calories: 45, potassium: 85, phosphorus: 15, sodium: 420, protein: 1 },
    ],
  },
  {
    id: "m-y-3",
    logged_at: isoAt(1, 19, 0),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Steamed fish", portion_g: 150, calories: 180, potassium: 280, phosphorus: 200, sodium: 90, protein: 32 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
    ],
  },

  // ── 2 days ago ──
  {
    id: "m-2d-1",
    logged_at: isoAt(2, 8, 0),
    method: "manual",
    risk_level: "safe",
    meal_items: [
      { food_name: "Toast with kaya", portion_g: 80, calories: 210, potassium: 45, phosphorus: 40, sodium: 190, protein: 4 },
      { food_name: "Soft-boiled egg", portion_g: 50, calories: 70, potassium: 55, phosphorus: 85, sodium: 60, protein: 6 },
      { food_name: "Kopi-O", portion_g: 200, calories: 10, potassium: 115, phosphorus: 5, sodium: 5, protein: 0.3 },
    ],
  },
  {
    id: "m-2d-2",
    logged_at: isoAt(2, 12, 30),
    method: "manual",
    risk_level: "caution",
    meal_items: [
      { food_name: "Tofu", portion_g: 150, calories: 110, potassium: 180, phosphorus: 140, sodium: 12, protein: 12 },
      { food_name: "Brown rice", portion_g: 180, calories: 220, potassium: 150, phosphorus: 160, sodium: 5, protein: 5 },
    ],
  },
  {
    id: "m-2d-3",
    logged_at: isoAt(2, 19, 15),
    method: "voice",
    risk_level: "safe",
    meal_items: [
      { food_name: "Chicken soup", portion_g: 300, calories: 150, potassium: 200, phosphorus: 110, sodium: 650, protein: 18 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
    ],
  },

  // ── 3 days ago ──
  {
    id: "m-3d-1",
    logged_at: isoAt(3, 7, 30),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Mee rebus", portion_g: 350, calories: 450, potassium: 310, phosphorus: 145, sodium: 920, protein: 16 },
    ],
  },
  {
    id: "m-3d-2",
    logged_at: isoAt(3, 13, 0),
    method: "manual",
    risk_level: "danger",
    meal_items: [
      { food_name: "Char kway teow", portion_g: 300, calories: 610, potassium: 280, phosphorus: 190, sodium: 1250, protein: 18 },
      { food_name: "Lime juice", portion_g: 250, calories: 35, potassium: 120, phosphorus: 15, sodium: 5, protein: 0.3 },
    ],
  },
  {
    id: "m-3d-3",
    logged_at: isoAt(3, 19, 30),
    method: "voice",
    risk_level: "safe",
    meal_items: [
      { food_name: "Steamed egg", portion_g: 120, calories: 90, potassium: 65, phosphorus: 95, sodium: 150, protein: 8 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
      { food_name: "Stir-fried cabbage", portion_g: 100, calories: 40, potassium: 170, phosphorus: 25, sodium: 280, protein: 1.5 },
    ],
  },

  // ── 4 days ago ──
  {
    id: "m-4d-1",
    logged_at: isoAt(4, 8, 10),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Nasi goreng", portion_g: 280, calories: 420, potassium: 190, phosphorus: 150, sodium: 780, protein: 12 },
      { food_name: "Fried egg", portion_g: 50, calories: 90, potassium: 70, phosphorus: 100, sodium: 170, protein: 6 },
    ],
  },
  {
    id: "m-4d-2",
    logged_at: isoAt(4, 13, 30),
    method: "voice",
    risk_level: "caution",
    meal_items: [
      { food_name: "Laksa", portion_g: 400, calories: 580, potassium: 350, phosphorus: 200, sodium: 1400, protein: 20 },
    ],
  },
  {
    id: "m-4d-3",
    logged_at: isoAt(4, 19, 0),
    method: "manual",
    risk_level: "safe",
    meal_items: [
      { food_name: "Grilled fish", portion_g: 150, calories: 180, potassium: 300, phosphorus: 210, sodium: 110, protein: 30 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
      { food_name: "Cucumber salad", portion_g: 80, calories: 15, potassium: 120, phosphorus: 20, sodium: 3, protein: 0.5 },
    ],
  },

  // ── 5 days ago ──
  {
    id: "m-5d-1",
    logged_at: isoAt(5, 7, 50),
    method: "manual",
    risk_level: "safe",
    meal_items: [
      { food_name: "Porridge with chicken", portion_g: 350, calories: 280, potassium: 200, phosphorus: 170, sodium: 450, protein: 18 },
    ],
  },
  {
    id: "m-5d-2",
    logged_at: isoAt(5, 12, 45),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Economy rice", portion_g: 300, calories: 480, potassium: 250, phosphorus: 190, sodium: 600, protein: 15 },
      { food_name: "Stir-fried bean sprouts", portion_g: 80, calories: 35, potassium: 110, phosphorus: 30, sodium: 180, protein: 2 },
    ],
  },
  {
    id: "m-5d-3",
    logged_at: isoAt(5, 19, 20),
    method: "voice",
    risk_level: "caution",
    meal_items: [
      { food_name: "Rendang chicken", portion_g: 150, calories: 320, potassium: 340, phosphorus: 220, sodium: 580, protein: 28 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
    ],
  },

  // ── 6 days ago ──
  {
    id: "m-6d-1",
    logged_at: isoAt(6, 8, 20),
    method: "scan",
    risk_level: "safe",
    meal_items: [
      { food_name: "Thosai with dhal", portion_g: 200, calories: 260, potassium: 280, phosphorus: 140, sodium: 310, protein: 10 },
    ],
  },
  {
    id: "m-6d-2",
    logged_at: isoAt(6, 13, 15),
    method: "manual",
    risk_level: "danger",
    meal_items: [
      { food_name: "Mee goreng mamak", portion_g: 350, calories: 590, potassium: 320, phosphorus: 210, sodium: 1380, protein: 16 },
      { food_name: "Teh ais", portion_g: 300, calories: 90, potassium: 100, phosphorus: 60, sodium: 20, protein: 2 },
    ],
  },
  {
    id: "m-6d-3",
    logged_at: isoAt(6, 19, 45),
    method: "voice",
    risk_level: "safe",
    meal_items: [
      { food_name: "Steamed tofu", portion_g: 150, calories: 110, potassium: 180, phosphorus: 140, sodium: 12, protein: 12 },
      { food_name: "White rice", portion_g: 200, calories: 260, potassium: 72, phosphorus: 88, sodium: 2, protein: 5 },
      { food_name: "Bok choy soup", portion_g: 200, calories: 25, potassium: 160, phosphorus: 35, sodium: 380, protein: 2 },
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
