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

    # Deduplicate by class name, keep highest confidence
    seen: dict[str, float] = {}
    for pred in raw_predictions:
        cls = pred.get("class", "")
        conf = pred.get("confidence", 0)
        if cls and (cls not in seen or conf > seen[cls]):
            seen[cls] = conf

    items: list[DetectedItem] = []
    for class_name, conf in seen.items():
        # Cross-reference against food database
        matches = fuzzy_match(class_name, threshold=0.35)

        if matches:
            food, match_conf = matches[0]
            entry = {**food}  # Use food's own default portion from DB
            items.append(DetectedItem(
                name=entry["name"],
                portion_g=entry["portion_g"],
                calories=entry["calories"],
                potassium_mg=entry["potassium_mg"],
                phosphorus_mg=entry["phosphorus_mg"],
                sodium_mg=entry["sodium_mg"],
                protein_g=entry["protein_g"],
                carbs_g=entry["carbs_g"],
                fat_g=entry["fat_g"],
                confidence=round(conf * match_conf, 2),
            ))
        else:
            # Detected but not in local DB — return with zero nutrients
            items.append(DetectedItem(
                name=class_name.replace("-", " ").replace("_", " ").title(),
                portion_g=UNKNOWN_FOOD_PORTION_G,
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
