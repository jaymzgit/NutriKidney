/**
 * CKD Nutrient Limits Engine
 *
 * Sources:
 * - KDOQI Clinical Practice Guideline for Nutrition in CKD
 *   Energy: 25-35 kcal/kg/day (using 30 as midpoint)
 *   Protein CKD 1-2: 0.8 g/kg/day
 *   Protein CKD 3-5: 0.55-0.60 g/kg/day (using 0.6)
 */

export type CkdStage = '1' | '2' | '3a' | '3b' | '4' | '5';

export type NutrientLimits = {
  calories: number;
  protein: number;
  sodium: number;
  potassium: number;
  phosphorus: number;
};

type StageConfig = {
  energy_kcal_per_kg: number;
  protein_g_per_kg: number;
  sodium_mg_max: number;
  potassium_mg_max: number;
  phosphorus_mg_max: number;
};

const DEFAULT_WEIGHT_KG = 60;

const CKD_STAGE_CONFIGS: Record<CkdStage, StageConfig> = {
  '1': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.8, sodium_mg_max: 2300, potassium_mg_max: 4000, phosphorus_mg_max: 1000 },
  '2': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.8, sodium_mg_max: 2300, potassium_mg_max: 4000, phosphorus_mg_max: 1000 },
  '3a': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.6, sodium_mg_max: 2300, potassium_mg_max: 2500, phosphorus_mg_max: 900 },
  '3b': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.6, sodium_mg_max: 2300, potassium_mg_max: 2500, phosphorus_mg_max: 900 },
  '4': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.6, sodium_mg_max: 2000, potassium_mg_max: 2000, phosphorus_mg_max: 800 },
  '5': { energy_kcal_per_kg: 30, protein_g_per_kg: 0.6, sodium_mg_max: 2000, potassium_mg_max: 1500, phosphorus_mg_max: 800 },
};

const DEFAULT_CONFIG: StageConfig = {
  energy_kcal_per_kg: 30,
  protein_g_per_kg: 0.8,
  sodium_mg_max: 2300,
  potassium_mg_max: 3000,
  phosphorus_mg_max: 800,
};

export function getLimitsForStage(
  stage: string | null | undefined,
  weightKg: number | null | undefined,
): NutrientLimits {
  const config = (stage && CKD_STAGE_CONFIGS[stage as CkdStage]) || DEFAULT_CONFIG;
  const w = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;

  return {
    calories: Math.round(config.energy_kcal_per_kg * w),
    protein: Math.round(config.protein_g_per_kg * w),
    sodium: config.sodium_mg_max,
    potassium: config.potassium_mg_max,
    phosphorus: config.phosphorus_mg_max,
  };
}

export { CKD_STAGE_CONFIGS };