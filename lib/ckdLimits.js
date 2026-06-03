// CKD stage-specific daily nutrient limits
// Based on Malaysian Dietary Guidelines for CKD patients

const CKD_LIMITS = {
  1: { calories: 2000, potassium: 4700, phosphorus: 1000, sodium: 2300, protein: 80 },
  2: { calories: 2000, potassium: 4700, phosphorus: 1000, sodium: 2300, protein: 80 },
  3: { calories: 1800, potassium: 2700, phosphorus: 800,  sodium: 2000, protein: 60 },
  4: { calories: 1800, potassium: 2000, phosphorus: 800,  sodium: 2000, protein: 50 },
  5: { calories: 1800, potassium: 1500, phosphorus: 600,  sodium: 1500, protein: 40 },
};

const DEFAULT_LIMITS = { calories: 2000, potassium: 3000, phosphorus: 800, sodium: 2000, protein: 60 };

export function getLimitsForStage(stage) {
  if (!stage || !CKD_LIMITS[stage]) return DEFAULT_LIMITS;
  return CKD_LIMITS[stage];
}

export { CKD_LIMITS, DEFAULT_LIMITS };