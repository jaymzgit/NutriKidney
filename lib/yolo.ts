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
const CONFIDENCE_THRESHOLD = 0.2;
const IOU_THRESHOLD = 0.3;
const MIN_BOX_AREA_FRACTION = 0.003;
const MAX_DETECTIONS = 10;

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

  // Resolve asset to a concrete file URI (Metro dev returns http URL; APK returns file://).
  // fast-tflite v3 native side requires {url} object — passing raw require() id fails on Android.
  _model = await loadTensorflowModel(
    require("@/assets/models/food_detect.tflite"),
    []
  );
  const m = _model as any;
  if (m.inputs) console.log("[YOLO] input shape:", JSON.stringify(m.inputs));
  if (m.outputs) console.log("[YOLO] output shape:", JSON.stringify(m.outputs));
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

type LetterboxInfo = {
  scale: number;
  padX: number; // pixels of padding on left (or right; symmetric)
  padY: number;
};

async function preprocessImage(uri: string): Promise<{
  input: Float32Array;
  origWidth: number;
  origHeight: number;
  letterbox: LetterboxInfo;
}> {
  const { width: origWidth, height: origHeight } = await getImageSize(uri);

  // Letterbox: resize maintaining aspect ratio, pad to square.
  const scale = Math.min(
    MODEL_INPUT_SIZE / origWidth,
    MODEL_INPUT_SIZE / origHeight
  );
  const newW = Math.round(origWidth * scale);
  const newH = Math.round(origHeight * scale);
  const padX = Math.floor((MODEL_INPUT_SIZE - newW) / 2);
  const padY = Math.floor((MODEL_INPUT_SIZE - newH) / 2);

  console.log(
    `[YOLO] preprocess: orig=${origWidth}x${origHeight} scale=${scale.toFixed(4)} newWH=${newW}x${newH} pad=${padX},${padY}`
  );

  // Resize keeping aspect ratio
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newW, height: newH } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  const response = await fetch(resized.uri);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const { data } = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });

  // Build NHWC float32 padded canvas (gray 114/255 like Ultralytics default).
  // TFLite uses NHWC: pixels are interleaved [R,G,B, R,G,B, ...] row by row.
  const pixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const input = new Float32Array(3 * pixels);
  const PAD_VAL = 114 / 255;
  input.fill(PAD_VAL);

  // Copy resized pixels into padded canvas (NHWC: 3 floats per pixel)
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const src = (y * newW + x) * 4;         // RGBA source
      const dstX = padX + x;
      const dstY = padY + y;
      const idx = (dstY * MODEL_INPUT_SIZE + dstX) * 3; // NHWC destination
      input[idx]     = data[src]     / 255;   // R
      input[idx + 1] = data[src + 1] / 255;   // G
      input[idx + 2] = data[src + 2] / 255;   // B
    }
  }

  return {
    input,
    origWidth,
    origHeight,
    letterbox: { scale, padX, padY },
  };
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
  origHeight: number,
  letterbox: LetterboxInfo
): Detection[] {
  const output = new Float32Array(rawOutput);
  const numClasses = CLASS_NAMES.length;

  // Model exports with NMS=True: shape [1, max_dets, 6]
  // Each row: [x1, y1, x2, y2, score, class_idx], coords normalized [0,1]
  // of the 640x640 padded input.
  const STRIDE = 6;
  const numDetections = Math.floor(output.length / STRIDE);
  const { scale, padX, padY } = letterbox;

  const detections: Detection[] = [];

  // Log raw values of first passing detection to verify coordinate format
  let firstLogDone = false;

  for (let i = 0; i < numDetections; i++) {
    const base = i * STRIDE;
    const score = output[base + 4];
    if (score < CONFIDENCE_THRESHOLD) continue;

    const classIdx = Math.round(output[base + 5]);
    if (classIdx < 0 || classIdx >= numClasses) continue;

    if (!firstLogDone) {
      console.log(
        `[YOLO] raw output[0..5] for first det: [${output[base].toFixed(4)}, ${output[base+1].toFixed(4)}, ${output[base+2].toFixed(4)}, ${output[base+3].toFixed(4)}, ${score.toFixed(4)}, ${output[base+5].toFixed(1)}] class=${CLASS_NAMES[classIdx]}`
      );
      firstLogDone = true;
    }

    // Ultralytics YOLO TFLite NMS output: [x1, y1, x2, y2, score, class_idx]
    // Coords normalized [0,1] relative to 640×640 padded canvas.
    const x1p = output[base + 0] * MODEL_INPUT_SIZE;
    const y1p = output[base + 1] * MODEL_INPUT_SIZE;
    const x2p = output[base + 2] * MODEL_INPUT_SIZE;
    const y2p = output[base + 3] * MODEL_INPUT_SIZE;

    // Reverse letterbox: subtract pad, divide by scale
    const x1 = (x1p - padX) / scale;
    const y1 = (y1p - padY) / scale;
    const x2 = (x2p - padX) / scale;
    const y2 = (y2p - padY) / scale;

    const x = Math.max(0, Math.min(origWidth, x1));
    const y = Math.max(0, Math.min(origHeight, y1));
    const w = Math.max(0, Math.min(origWidth, x2)) - x;
    const h = Math.max(0, Math.min(origHeight, y2)) - y;

    if (w <= 0 || h <= 0) continue;

    detections.push({
      x,
      y,
      width: w,
      height: h,
      className: CLASS_NAMES[classIdx],
      confidence: Math.round(score * 100) / 100,
    });
  }

  // Log raw above-threshold detections for diagnosis
  console.log(
    "[YOLO] raw detections:",
    detections
      .map((d) => `${d.className}=${d.confidence}`)
      .join(", ")
  );

  // Drop tiny boxes (noise)
  const imgArea = origWidth * origHeight;
  const filtered = detections.filter(
    (d) => (d.width * d.height) / imgArea >= MIN_BOX_AREA_FRACTION
  );

  // Dedupe by class — keep highest-confidence box per className
  const byClass = new Map<string, Detection>();
  for (const d of filtered) {
    const cur = byClass.get(d.className);
    if (!cur || d.confidence > cur.confidence) byClass.set(d.className, d);
  }
  const deduped = Array.from(byClass.values());

  const kept = nms(deduped, IOU_THRESHOLD);
  console.log(
    `[YOLO] kept=${kept.length} (raw=${detections.length}, after-dedupe=${deduped.length})`
  );
  kept.forEach((b) => {
    const cx = ((b.x + b.width / 2) / origWidth * 100).toFixed(1);
    const cy = ((b.y + b.height / 2) / origHeight * 100).toFixed(1);
    console.log(
      `[YOLO] det: ${b.className} conf=${b.confidence} center=(${cx}%,${cy}%) px=(${b.x.toFixed(0)},${b.y.toFixed(0)},${b.width.toFixed(0)},${b.height.toFixed(0)}) img=${origWidth}x${origHeight}`
    );
  });
  return kept.slice(0, MAX_DETECTIONS);
}

// ── Public API ──────────────────────────────────────

export async function detectFood(imageUri: string): Promise<{
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
}> {
  if (!_model) throw new Error("Model not loaded. Call loadModel() first.");

  const { input, origWidth, origHeight, letterbox } =
    await preprocessImage(imageUri);
  const outputs = _model.runSync([input.buffer as ArrayBuffer]);
  const detections = postProcess(outputs[0], origWidth, origHeight, letterbox);

  return { detections, imageWidth: origWidth, imageHeight: origHeight };
}
