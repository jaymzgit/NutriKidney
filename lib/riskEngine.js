// Rule-based CKD risk inference engine
// Classifies daily nutrient intake AND individual meals into Safe / Caution / Danger

import { getLimitsForStage } from './ckdLimits';

export function getRiskLevel(totals, ckdStage, weightKg) {
  if (!ckdStage) return { level: 'unknown', message: 'Set your CKD stage to see risk assessment' };

  const limits = getLimitsForStage(ckdStage, weightKg);
  const nutrients = ['potassium', 'phosphorus', 'sodium', 'protein'];

  let hasDanger = false;
  let hasCaution = false;

  for (const key of nutrients) {
    const ratio = (totals[key] || 0) / limits[key];
    if (ratio > 1.0) hasDanger = true;
    else if (ratio >= 0.8) hasCaution = true;
  }

  if (hasDanger) return { level: 'danger', message: 'Daily limit exceeded — eat light for the rest of the day' };
  if (hasCaution) return { level: 'caution', message: 'Getting close to your daily limits' };
  return { level: 'safe', message: "You're on track today — keep it up!" };
}

/**
 * Per-meal risk classifier.
 *
 * mealItems: array of cart/meal items. Each item may use either:
 *   - scan/cart shape: { potassium_mg, phosphorus_mg, sodium_mg, protein_g }
 *   - normalized shape: { potassium, phosphorus, sodium, protein }
 *
 * todayTotals (optional): already-logged totals for today, same keys as getRiskLevel.
 *   When provided, the meal is judged against projected daily intake too.
 *
 * Rules per nutrient (K / P / Na / Protein):
 *   danger  — projected (today + meal) > 100% of limit, OR meal alone > 60% of limit
 *   caution — projected >= 80% of limit, OR meal alone >= 40% of limit
 *   safe    — otherwise
 */
export function getMealRiskLevel(
  mealItems,
  ckdStage,
  weightKg,
  todayTotals
) {
  if (!ckdStage) return { level: 'safe', perNutrient: [] };

  const limits = getLimitsForStage(ckdStage, weightKg);
  const items = mealItems || [];

  const mealTotals = items.reduce(
    (acc, it) => ({
      potassium: acc.potassium + (it.potassium ?? it.potassium_mg ?? 0),
      phosphorus: acc.phosphorus + (it.phosphorus ?? it.phosphorus_mg ?? 0),
      sodium: acc.sodium + (it.sodium ?? it.sodium_mg ?? 0),
      protein: acc.protein + (it.protein ?? it.protein_g ?? 0),
    }),
    { potassium: 0, phosphorus: 0, sodium: 0, protein: 0 }
  );

  const today = todayTotals || { potassium: 0, phosphorus: 0, sodium: 0, protein: 0 };
  const keys = ['potassium', 'phosphorus', 'sodium', 'protein'];

  let level = 'safe';
  const perNutrient = [];

  for (const k of keys) {
    const limit = limits[k];
    if (!limit) continue;
    const mealShare = mealTotals[k] / limit;
    const projected = ((today[k] || 0) + mealTotals[k]) / limit;

    let nutrientLevel = 'safe';
    if (projected > 1.0 || mealShare > 0.6) nutrientLevel = 'danger';
    else if (projected >= 0.8 || mealShare >= 0.4) nutrientLevel = 'caution';

    perNutrient.push({
      key: k,
      mealAmount: mealTotals[k],
      limit,
      mealShare,
      projected,
      level: nutrientLevel,
    });

    if (nutrientLevel === 'danger') level = 'danger';
    else if (nutrientLevel === 'caution' && level !== 'danger') level = 'caution';
  }

  return { level, perNutrient, mealTotals };
}
