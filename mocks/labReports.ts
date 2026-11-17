import { simulateNetwork } from "./config";

/** Mirrors backend/routers/ocr.py `OcrResult`. */
export type OcrResult = {
  egfr: number | null;
  creatinine: number | null;
  potassium: number | null;
  phosphorus: number | null;
  raw_text: string;
  confidence: number;
};

export type LabReport = {
  id: string;
  reportDate: string; // YYYY-MM-DD
  egfr: number | null;
  creatinine: number | null;
  potassium: number | null;
  phosphorus: number | null;
  imageUri?: string | null;
  createdAt: string;
};

/** Field metadata for the review form — units and typical adult ranges. */
export const LAB_FIELDS: {
  key: "egfr" | "creatinine" | "potassium" | "phosphorus";
  label: string;
  unit: string;
  typical: string;
}[] = [
  { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", typical: "Typical: 90 or above" },
  { key: "creatinine", label: "Creatinine", unit: "µmol/L", typical: "Typical: 60–110" },
  { key: "potassium", label: "Potassium", unit: "mmol/L", typical: "Typical: 3.5–5.0" },
  { key: "phosphorus", label: "Phosphate", unit: "mmol/L", typical: "Typical: 0.8–1.5" },
];

const SAMPLE_OCR: OcrResult = {
  egfr: 42,
  creatinine: 148,
  potassium: 5.2,
  phosphorus: 1.4,
  raw_text:
    "RENAL PROFILE\nCreatinine 148 umol/L (60-110) H\neGFR 42 mL/min/1.73m2\nPotassium 5.2 mmol/L (3.5-5.0) H\nPhosphate 1.4 mmol/L (0.8-1.5)",
  confidence: 0.86,
};

// In-memory store so saved reports show up during the session.
let store: LabReport[] = [
  {
    id: "lab-seed-1",
    reportDate: "2026-06-12",
    egfr: 45,
    creatinine: 139,
    potassium: 4.8,
    phosphorus: 1.3,
    createdAt: "2026-06-12T09:00:00.000Z",
  },
];

/**
 * Extract lab values from a photo of a lab report.
 *
 * // MOCK: replace with real OCR integration — POST the image to /ocr/extract
 * // (backend/routers/ocr.py) as multipart `file` and return its OcrResult.
 */
export async function recognizeText(image: {
  uri: string;
  mimeType?: string | null;
}): Promise<OcrResult> {
  void image;
  await simulateNetwork(2600);
  return { ...SAMPLE_OCR };
}

/**
 * Save a reviewed lab report.
 *
 * // MOCK: replace with real lab report storage (e.g. Supabase `lab_reports`
 * // table insert, with the image uploaded to a storage bucket).
 */
export async function saveLabReport(
  report: Omit<LabReport, "id" | "createdAt">
): Promise<LabReport> {
  await simulateNetwork(800);
  const saved: LabReport = {
    ...report,
    id: `lab-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  store = [saved, ...store];
  return saved;
}

/**
 * List the user's saved lab reports, newest first.
 *
 * // MOCK: replace with real lab report fetch (e.g. Supabase `lab_reports`
 * // select for the current user, ordered by report date).
 */
export async function fetchLabReports(): Promise<LabReport[]> {
  await simulateNetwork(700);
  return [...store].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}
