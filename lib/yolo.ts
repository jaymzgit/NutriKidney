/**
 * On-device YOLO26 food detection pipeline.
 *
 * Uses react-native-fast-tflite for TFLite inference.
 * YOLO26-Nano by Ultralytics — optimized for mobile/edge.
 *
 * Training:
 * 1. Export Roboflow dataset → format "YOLOv8" (same format for YOLO26)
 * 2. pip install ultralytics
 * 3. yolo detect train data=data.yaml model=yolo26n.pt epochs=100 imgsz=640
 * 4. yolo export model=best.pt format=tflite half=True
 * 5. Place .tflite at assets/models/best_float16.tflite
 * 6. npx expo prebuild && npx expo run:android
 *
 * Output format (Ultralytics convention): [1, 4+num_classes, num_anchors]
 * No objectness score — class scores are direct confidences.
 */

import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { decode as decodeJpeg } from "jpeg-js";

// ── Configuration ───────────────────────────────────

const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.45;

/**
 * Class names matching Roboflow project order (alphabetical).
 * Must match the order your TFLite model was exported with.
 * Check your model's labels.txt if detection classes look wrong.
 */
export const CLASS_NAMES = [
  "Anchovies",
  "Boiled-Egg",
  "Char-Kuey-Teow",
  "Chicken-Rendang",
  "Curry-Puff",
  "Fried-Chicken",
  "Fried-Egg",
  "Fried-Rice",
  "Hokkien-Mee",
  "Lo-Mein",
  "Mee-Rebus",
  "Mee-Siam",
  "Peanuts",
  "Rice",
  "Roti-Canai",
  "Sambal",
  "Slices-Cucumber",
];

// ── Types ───────────────────────────────────────────

export type Detection = {
  x: number; // top-left x in original image coords
  y: number; // top-left y
  width: number;
  height: number;
  className: string;
  confidence: number;
};

// ── Model state ─────────────────────────────────────

type TFModel = {
  runSync(inputs: ArrayBuffer[]): ArrayBuffer[];
};

let _model: TFModel | null = null;

export async function loadModel(): Promise<void> {
  if (_model) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { loadTensorflowModel } = require("react-native-fast-tflite");
  _model = await loadTensorflowModel(
    require("@/assets/models/food_detect.tflite")
  );
}

export function isModelLoaded(): boolean {
  return _model !== null;
}

// ── Helpers ─────────────────────────────────────────

function getImageSize(
  uri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

// ── Preprocessing ───────────────────────────────────

async function preprocessImage(uri: string): Promise<{
  input: Float32Array;
  origWidth: number;
  origHeight: number;
}> {
  // Original dimensions
  const { width: origWidth, height: origHeight } = await getImageSize(uri);

  // Resize to model input (stretch to square — simpler coord mapping)
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  // Read resized image bytes via fetch, decode JPEG to RGBA pixels
  const response = await fetch(resized.uri);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const { data } = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });

  // Convert to NCHW float32 normalized [0,1]
  const pixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const input = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    input[i] = data[i * 4] / 255; // R
    input[pixels + i] = data[i * 4 + 1] / 255; // G
    input[2 * pixels + i] = data[i * 4 + 2] / 255; // B
  }

  return { input, origWidth, origHeight };
}

// ── Post-processing ─────────────────────────────────

function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function nms(dets: Detection[], threshold: number): Detection[] {
  dets.sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < dets.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(dets[i]);
    for (let j = i + 1; j < dets.length; j++) {
      if (!suppressed.has(j) && iou(dets[i], dets[j]) > threshold) {
        suppressed.add(j);
      }
    }
  }
  return keep;
}

function postProcess(
  rawOutput: ArrayBuffer,
  origWidth: number,
  origHeight: number
): Detection[] {
  const output = new Float32Array(rawOutput);
  const numClasses = CLASS_NAMES.length;
  const numValues = 4 + numClasses;
  // Derive anchor count from tensor size (robust across YOLO versions)
  const numDetections = Math.floor(output.length / numValues);

  const detections: Detection[] = [];

  for (let i = 0; i < numDetections; i++) {
    // Ultralytics output: [1, 4+numClasses, numDetections]
    // Row-major: value at [row][col] = output[row * numDetections + col]
    let maxScore = 0;
    let maxIdx = 0;
    for (let c = 0; c < numClasses; c++) {
      const score = output[(4 + c) * numDetections + i];
      if (score > maxScore) {
        maxScore = score;
        maxIdx = c;
      }
    }

    if (maxScore < CONFIDENCE_THRESHOLD) continue;

    const xc = output[0 * numDetections + i];
    const yc = output[1 * numDetections + i];
    const w = output[2 * numDetections + i];
    const h = output[3 * numDetections + i];

    // Map from 640x640 model space to original image space
    const sx = origWidth / MODEL_INPUT_SIZE;
    const sy = origHeight / MODEL_INPUT_SIZE;

    detections.push({
      x: (xc - w / 2) * sx,
      y: (yc - h / 2) * sy,
      width: w * sx,
      height: h * sy,
      className: CLASS_NAMES[maxIdx],
      confidence: Math.round(maxScore * 100) / 100,
    });
  }

  return nms(detections, IOU_THRESHOLD);
}

// ── Public API ──────────────────────────────────────

export async function detectFood(imageUri: string): Promise<{
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
}> {
  if (!_model) throw new Error("Model not loaded. Call loadModel() first.");

  const { input, origWidth, origHeight } = await preprocessImage(imageUri);
  const outputs = _model.runSync([input.buffer as ArrayBuffer]);
  const detections = postProcess(outputs[0], origWidth, origHeight);

  return { detections, imageWidth: origWidth, imageHeight: origHeight };
}
