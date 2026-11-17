"""
routers/scan.py

Food detection endpoint using Roboflow inference.

Accepts an uploaded image, runs the malaysian-food-recognition model,
cross-references detected food names against the local food database
for nutrient data.
"""

import base64
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from inference_sdk import InferenceHTTPClient

from routers.food import fuzzy_match

router = APIRouter()

# ── Roboflow client ─────────────────────────────────

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
MODEL_ID = "malaysian-food-recognition-ourez/5"

def _get_client() -> InferenceHTTPClient:
    if not ROBOFLOW_API_KEY:
        raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY not set")
    return InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key=ROBOFLOW_API_KEY,
    )

# ── Response models ─────────────────────────────────

class DetectedItem(BaseModel):
    name: str
    portion_g: float
    calories: float
    potassium_mg: float
    phosphorus_mg: float
    sodium_mg: float
    protein_g: float
    carbs_g: float
    fat_g: float
    confidence: float

class DetectResponse(BaseModel):
    items: list[DetectedItem]
    raw_predictions: list[dict]

# ── Fallback portion for foods not in the database ──

UNKNOWN_FOOD_PORTION_G = 150

# Portion estimation from bounding-box area.
# Mirrors app/(tabs)/scan.tsx so the API-fallback path and the on-device path
# produce the same numbers for the same photo. See PLAN-portion-estimation.md —
# this constant-based heuristic is what Phase 1 (plate normalization) replaces;
# until then both paths must at least agree.
REFERENCE_AREA_FRACTION = 0.12
MIN_PORTION_SCALE = 0.5
MAX_PORTION_SCALE = 2.0


def portion_scale(pred) -> float:
    """Bbox area → multiplier of the food's default portion.

    Roboflow returns x/y as the box CENTER plus width/height, all normalized
    to [0,1], so w*h is already the image-area fraction. Missing or invalid
    geometry (classification-style responses, bare class-name strings) → 1.0.
    """
    if not isinstance(pred, dict):
        return 1.0
    try:
        bw = float(pred.get("width") or 0)
        bh = float(pred.get("height") or 0)
    except (TypeError, ValueError):
        return 1.0
    if bw <= 0 or bh <= 0:
        return 1.0
    scale = (bw * bh) / REFERENCE_AREA_FRACTION
    return max(MIN_PORTION_SCALE, min(MAX_PORTION_SCALE, scale))

# ── POST /scan/detect ───────────────────────────────

@router.post("/detect", response_model=DetectResponse)
async def detect_food(file: UploadFile = File(...)):
    """
    Accept a meal photo, run Roboflow inference, and return
    detected food items with nutrient data from the food database.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    b64_image = base64.b64encode(contents).decode("utf-8")

    client = _get_client()
    try:
        result = client.infer(b64_image, model_id=MODEL_ID)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Roboflow inference failed: {e}")

    # Parse predictions — classification or detection model
    predictions = result.get("predictions", [])
    if not predictions and "predicted_classes" in result:
        # Classification model returns top predictions
        predictions = result.get("predicted_classes", [])

    # Handle classification-style response (top, confidence)
    if isinstance(result.get("top"), str):
        predictions = [{
            "class": result["top"],
            "confidence": result.get("confidence", 0.5),
        }]

    raw_predictions = predictions if isinstance(predictions, list) else []

    # One item per detection — do NOT dedupe by class: two servings of rice
    # are two portions (same fix as lib/yolo.ts). Roboflow runs NMS
    # server-side, so remaining rows are distinct physical foods.
    items: list[DetectedItem] = []
    seen: dict[str, float] = {}
    for pred in raw_predictions:
        if isinstance(pred, str):
            # predicted_classes returns bare class-name strings
            class_name, conf = pred, 0.5
        elif isinstance(pred, dict):
            class_name = str(pred.get("class", "") or "")
            conf = float(pred.get("confidence", 0) or 0)
        else:
            continue
        if not class_name:
            continue
        if class_name in seen:
            # Same class again — keep only if clearly a different instance
            # (we can't tell instances apart without box geometry); skip
            # duplicates with near-identical confidence to avoid double-count.
            if abs(conf - seen[class_name]) < 0.05:
                continue
        seen[class_name] = conf

        # Same heuristic as the on-device path (see portion_scale above).
        scale = portion_scale(pred)

        # Cross-reference against food database
        matches = fuzzy_match(class_name, threshold=0.35)

        if matches:
            food, match_conf = matches[0]
            base_portion = float(food.get("portion_g") or 0) or 1.0
            items.append(DetectedItem(
                name=food["name"],
                portion_g=round(base_portion * scale, 1),
                calories=round(food["calories"] * scale, 1),
                potassium_mg=round(food["potassium_mg"] * scale, 1),
                phosphorus_mg=round(food["phosphorus_mg"] * scale, 1),
                sodium_mg=round(food["sodium_mg"] * scale, 1),
                protein_g=round(food["protein_g"] * scale, 1),
                carbs_g=round(food["carbs_g"] * scale, 1),
                fat_g=round(food["fat_g"] * scale, 1),
                confidence=round(conf * match_conf, 2),
            ))
        else:
            # Detected but not in local DB — zero nutrients, scaled portion.
            # The app flags these (calories === 0) for manual correction.
            items.append(DetectedItem(
                name=class_name.replace("-", " ").replace("_", " ").title(),
                portion_g=round(UNKNOWN_FOOD_PORTION_G * scale, 1),
                calories=0,
                potassium_mg=0,
                phosphorus_mg=0,
                sodium_mg=0,
                protein_g=0,
                carbs_g=0,
                fat_g=0,
                confidence=round(conf * 0.3, 2),
            ))

    return DetectResponse(items=items, raw_predictions=raw_predictions)
