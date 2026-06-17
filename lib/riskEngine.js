// Rule-based CKD risk inference engine (placeholder)
// Classifies daily nutrient intake into Safe / Caution / Danger

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

export function getMealRiskLevel(mealItems, ckdStage, weightKg) {
  // TODO: Placeholder — will evaluate individual meal risk
  return 'safe';
}