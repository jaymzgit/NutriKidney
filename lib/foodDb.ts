/**
 * Local food database with fuzzy matching.
 * Used for on-device food detection cross-referencing and manual search.
 * Works fully offline — no backend needed.
 */

import FOOD_DB from "@/backend/data/food_db.json";

export type FoodEntry = {
  name: string;
  class_label: string;
  aliases: string[];
  portion_g: number;
  calories: number;
  potassium_mg: number;
  phosphorus_mg: number;
  sodium_mg: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const db = FOOD_DB as FoodEntry[];

/** Levenshtein-based similarity ratio (0–1). */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (!la || !lb) return 0;

  const prev = new Array(lb + 1);
  const curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], curr[j - 1], prev[j]);
    }
    for (let j = 0; j <= lb; j++) prev[j] = curr[j];
  }

  return 1 - prev[lb] / Math.max(la, lb);
}

/**
 * Match a YOLO class name against the food database.
 * Tries exact class_label match first, then fuzzy on name + aliases.
 */
export function matchFood(
  className: string,
  threshold = 0.4
): { food: FoodEntry; confidence: number } | null {
  const query = className
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .trim();

  let bestFood: FoodEntry | null = null;
  let bestScore = 0;

  for (const food of db) {
    const label = food.class_label.replace(/_/g, " ");
    if (query === label) return { food, confidence: 1.0 };
    if (query === food.name.toLowerCase()) return { food, confidence: 1.0 };

    let score = similarity(query, food.name.toLowerCase());

    for (const alias of food.aliases ?? []) {
      const al = alias.toLowerCase();
      if (query === al) return { food, confidence: 1.0 };
      const sim = similarity(query, al);
      const bonus =
        query.includes(al) || al.includes(query) ? 0.2 : 0;
      score = Math.max(score, Math.min(sim + bonus, 1.0));
    }

    if (score > bestScore) {
      bestScore = score;
      bestFood = food;
    }
  }

  if (bestFood && bestScore >= threshold) {
    return { food: bestFood, confidence: Math.round(bestScore * 100) / 100 };
  }
  return null;
}

/** Scale nutrient values from a food's base portion to a target portion. */
export function scaleFood(food: FoodEntry, targetPortion: number): FoodEntry {
  const ratio = food.portion_g > 0 ? targetPortion / food.portion_g : 1;
  return {
    ...food,
    portion_g: targetPortion,
    calories: Math.round(food.calories * ratio * 10) / 10,
    potassium_mg: Math.round(food.potassium_mg * ratio * 10) / 10,
    phosphorus_mg: Math.round(food.phosphorus_mg * ratio * 10) / 10,
    sodium_mg: Math.round(food.sodium_mg * ratio * 10) / 10,
    protein_g: Math.round(food.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_g * ratio * 10) / 10,
  };
}

/**
 * Substring search the food database (manual search mode).
 * Splits query into words; each word must appear inside some
 * name/alias/class_label token. No Levenshtein noise.
 */
export function searchFoods(
  query: string,
  limit = 10
): Array<{ food: FoodEntry; confidence: number }> {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const queryWords = q.split(/\s+/).filter(Boolean);

  const results: Array<{ food: FoodEntry; confidence: number }> = [];

  for (const food of db) {
    const haystacks: string[] = [
      food.name.toLowerCase(),
      food.class_label.toLowerCase().replace(/[_-]/g, " "),
      ...(food.aliases ?? []).map((a) => a.toLowerCase()),
    ];

    // Every query word must appear in at least one haystack token.
    const allMatch = queryWords.every((w) =>
      haystacks.some((h) => h.includes(w))
    );
    if (!allMatch) continue;

    // Confidence: best match quality — exact token > startsWith > substring.
    let score = 0.5;
    for (const h of haystacks) {
      if (h === q) {
        score = 1.0;
        break;
      }
      if (h.startsWith(q)) score = Math.max(score, 0.85);
      else if (h.includes(q)) score = Math.max(score, 0.7);
    }

    results.push({ food, confidence: Math.round(score * 100) / 100 });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, limit);
}
