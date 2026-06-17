/**
Sources:
- KDOQI Clinical Practice Guideline for Nutrition in CKD (KDOQI S43):
  Metabolically stable adults with CKD 1-5D or post-transplantation:
  Recommended energy intake = 25-35 kcal/kg/day.

- KDOQI Clinical Practice Guideline for Nutrition in CKD:
  CKD 3-5 metabolically stable:
  Low protein diet: 0.55-0.60 g/kg/day
  Very low protein diet: 0.28-0.43 g/kg/day with keto acid supplements
  
  CKD 3-5 with diabetes: 0.6-0.8 g/kg/day
  CKD 5D maintenance hemodialysis (MHD): 1.0-1.2 g/kg/day
  CKD 5D peritoneal dialysis (PD): 1.0-1.2 g/kg/day

  Default adult protein requirement used due to absence of CKD 1–2 restriction
  *U.S. Dietary Guidelines (2026): 0.8 g/kg/day to prevent deficiency
 */


export type CkdStage = '1' | '2' | '3a' | '3b' | '4' | '5' | '5d_hd' | '5d_pd';


export type NutrientLimits = {
  calories: number;
  potassium: number;
  phosphorus: number;
  sodium: number;
  protein: number;
  fluid: number | null;
};


type StageConfig = {
  energy_kcal_per_kg: number;
  protein_g_per_kg: number;
  sodium_mg_max: number;
  potassium_mg_max: number;
  phosphorus_mg_max: number;
  fluid_ml_max: number | null;
};


const DEFAULT_WEIGHT_KG = 60;


// KDOQI-based energy + protein values
const CKD_STAGE_CONFIGS: Record<CkdStage, StageConfig> = {

  // CKD 1-2:
  // Energy: 25-35 kcal/kg/day
  // Protein: normal intake ~0.8 g/kg/day
  '1': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.8,
    sodium_mg_max: 2300,
    potassium_mg_max: 4000,
    phosphorus_mg_max: 1000,
    fluid_ml_max: null
  },

  '2': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.8,
    sodium_mg_max: 2300,
    potassium_mg_max: 4000,
    phosphorus_mg_max: 1000,
    fluid_ml_max: null
  },


  // CKD 3-5:
  // Protein: 0.55-0.60 g/kg/day
  // Using upper end: 0.60 g/kg/day
  '3a': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.6,
    sodium_mg_max: 2300,
    potassium_mg_max: 2500,
    phosphorus_mg_max: 900,
    fluid_ml_max: 2000
  },

  '3b': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.6,
    sodium_mg_max: 2300,
    potassium_mg_max: 2500,
    phosphorus_mg_max: 900,
    fluid_ml_max: 1500
  },

  '4': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.6,
    sodium_mg_max: 2000,
    potassium_mg_max: 2000,
    phosphorus_mg_max: 800,
    fluid_ml_max: 1500
  },

  '5': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 0.6,
    sodium_mg_max: 2000,
    potassium_mg_max: 1500,
    phosphorus_mg_max: 800,
    fluid_ml_max: 1000
  },


  // CKD 5D Hemodialysis:
  // Protein: 1.0-1.2 g/kg/day
  // Using midpoint: 1.1 g/kg/day
  '5d_hd': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 1.1,
    sodium_mg_max: 2300,
    potassium_mg_max: 2500,
    phosphorus_mg_max: 900,
    fluid_ml_max: 1000
  },


  // CKD 5D Peritoneal Dialysis:
  // Protein: 1.0-1.2 g/kg/day
  // Using midpoint: 1.1 g/kg/day
  '5d_pd': {
    energy_kcal_per_kg: 30,
    protein_g_per_kg: 1.1,
    sodium_mg_max: 2300,
    potassium_mg_max: 3000,
    phosphorus_mg_max: 900,
    fluid_ml_max: 2000
  }

};


const DEFAULT_CONFIG: StageConfig = {
  energy_kcal_per_kg: 30,
  protein_g_per_kg: 0.8,
  sodium_mg_max: 2300,
  potassium_mg_max: 3000,
  phosphorus_mg_max: 800,
  fluid_ml_max: null,
};


export function getLimitsForStage(
  stage: string | null | undefined,
  weightKg: number | null | undefined,
): NutrientLimits {

  const config =
    (stage && CKD_STAGE_CONFIGS[stage as CkdStage])
    || DEFAULT_CONFIG;


  const w =
    weightKg && weightKg > 0
      ? weightKg
      : DEFAULT_WEIGHT_KG;


  return {
    calories: Math.round(config.energy_kcal_per_kg * w),
    protein: Math.round(config.protein_g_per_kg * w),

    sodium: config.sodium_mg_max,
    potassium: config.potassium_mg_max,
    phosphorus: config.phosphorus_mg_max,
    fluid: config.fluid_ml_max,
  };
}


export { CKD_STAGE_CONFIGS };