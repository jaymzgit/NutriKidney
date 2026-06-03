"""
routers/food.py

Food lookup and AI parsing endpoints.

Endpoints:
  POST /food/lookup   — search the food database by name
  POST /food/parse     — parse a natural-language meal description into structured food items
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import os
import re
from difflib import SequenceMatcher

router = APIRouter()

# ── Load the food database ──────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
FOOD_DB_PATH = os.path.join(DATA_DIR, "food_db.json")

def load_food_db():
    with open(FOOD_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

FOOD_DB = load_food_db()

# ── Request / Response models ───────────────────────

class FoodLookupRequest(BaseModel):
    query: str
    portion_g: Optional[float] = None  # If provided, scale nutrients to this portion

class FoodItem(BaseModel):
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

class FoodLookupResponse(BaseModel):
    found: bool
    items: list[FoodItem]

class ParseMealRequest(BaseModel):
    text: str  # e.g. "I had 1 plate of rice with chicken and kangkung"

class ParseMealResponse(BaseModel):
    items: list[FoodItem]
    raw_text: str

# ── Fuzzy matching helper ───────────────────────────

def fuzzy_match(query: str, threshold: float = 0.5) -> list[tuple[dict, float]]:
    """
    Search the food database for matches.
    Returns list of (food_entry, confidence) sorted by confidence descending.
    """
    query_lower = query.lower().strip()
    results = []

    for food in FOOD_DB:
        best_score = 0.0

        # Check exact match on name
        if query_lower == food["name"].lower():
            best_score = 1.0
        else:
            # Check aliases
            for alias in food.get("aliases", []):
                if query_lower == alias.lower():
                    best_score = 1.0
                    break
                # Substring match
                if query_lower in alias.lower() or alias.lower() in query_lower:
                    score = SequenceMatcher(None, query_lower, alias.lower()).ratio()
                    best_score = max(best_score, score + 0.2)  # Bonus for substring
                else:
                    score = SequenceMatcher(None, query_lower, alias.lower()).ratio()
                    best_score = max(best_score, score)

            # Also check against the display name
            name_score = SequenceMatcher(None, query_lower, food["name"].lower()).ratio()
            best_score = max(best_score, name_score)

        if best_score >= threshold:
            results.append((food, min(best_score, 1.0)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results

def scale_food(food: dict, target_portion_g: float) -> dict:
    """Scale nutrient values from the database portion to a target portion."""
    base_portion = food["portion_g"]
    if base_portion <= 0:
        return food
    ratio = target_portion_g / base_portion
    return {
        **food,
        "portion_g": target_portion_g,
        "calories": round(food["calories"] * ratio, 1),
        "potassium_mg": round(food["potassium_mg"] * ratio, 1),
        "phosphorus_mg": round(food["phosphorus_mg"] * ratio, 1),
        "sodium_mg": round(food["sodium_mg"] * ratio, 1),
        "protein_g": round(food["protein_g"] * ratio, 1),
        "carbs_g": round(food["carbs_g"] * ratio, 1),
        "fat_g": round(food["fat_g"] * ratio, 1),
    }

# ── POST /food/lookup ───────────────────────────────

@router.post("/lookup", response_model=FoodLookupResponse)
async def lookup_food(req: FoodLookupRequest):
    """
    Look up a food by name. Returns the best matches from the database.
    If portion_g is provided, nutrients are scaled to that portion size.
    """
    matches = fuzzy_match(req.query, threshold=0.4)

    if not matches:
        return FoodLookupResponse(found=False, items=[])

    items = []
    for food, confidence in matches[:5]:  # Top 5 matches
        entry = food.copy()
        if req.portion_g and req.portion_g > 0:
            entry = scale_food(entry, req.portion_g)

        items.append(FoodItem(
            name=entry["name"],
            portion_g=entry["portion_g"],
            calories=entry["calories"],
            potassium_mg=entry["potassium_mg"],
            phosphorus_mg=entry["phosphorus_mg"],
            sodium_mg=entry["sodium_mg"],
            protein_g=entry["protein_g"],
            carbs_g=entry["carbs_g"],
            fat_g=entry["fat_g"],
            confidence=round(confidence, 2),
        ))

    return FoodLookupResponse(found=True, items=items)

# ── POST /food/parse ────────────────────────────────

# Common portion patterns for parsing natural language
PORTION_PATTERNS = [
    (r'(\d+)\s*plates?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 250)),
    (r'(\d+)\s*bowls?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 300)),
    (r'(\d+)\s*cups?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 240)),
    (r'(\d+)\s*pieces?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 80)),
    (r'(\d+)\s*slices?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 30)),
    (r'(\d+)\s*sticks?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 20)),
    (r'(\d+)\s*servings?\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)) * 200)),
    (r'(\d+)g\s+(?:of\s+)?(.+)', lambda m: (m.group(2).strip(), float(m.group(1)))),
    (r'(.+)', lambda m: (m.group(1).strip(), None)),  # Fallback: no portion specified
]

def parse_food_segment(segment: str) -> tuple[str, Optional[float]]:
    """Parse a single food mention like '1 plate of rice' into (food_name, portion_g)."""
    segment = segment.strip()
    # Remove leading "I had", "I ate", etc.
    segment = re.sub(r'^(i\s+)?(had|ate|eaten|drink|drank)\s+', '', segment, flags=re.IGNORECASE)
    segment = segment.strip()

    for pattern, extractor in PORTION_PATTERNS:
        m = re.match(pattern, segment, re.IGNORECASE)
        if m:
            food_name, portion = extractor(m)
            if food_name:
                return food_name, portion

    return segment, None

@router.post("/parse", response_model=ParseMealResponse)
async def parse_meal(req: ParseMealRequest):
    """
    Parse a natural language meal description into structured food items.
    Example: "I had 1 plate of rice with chicken and kangkung"
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Split on common separators: "and", "with", ","  
    # But keep "chicken rice" together — split on connectors only
    segments = re.split(r'\s+(?:and|with|,)\s+', text, flags=re.IGNORECASE)
    # Also handle "I had X, Y, and Z" patterns
    cleaned_segments = []
    for seg in segments:
        seg = seg.strip().rstrip('.')
        if seg:
            cleaned_segments.append(seg)

    items = []
    for segment in cleaned_segments:
        food_name, portion_g = parse_food_segment(segment)

        # Try to find in database
        matches = fuzzy_match(food_name, threshold=0.4)

        if matches:
            best_food, confidence = matches[0]
            entry = best_food.copy()

            if portion_g and portion_g > 0:
                entry = scale_food(entry, portion_g)

            items.append(FoodItem(
                name=entry["name"],
                portion_g=entry["portion_g"],
                calories=entry["calories"],
                potassium_mg=entry["potassium_mg"],
                phosphorus_mg=entry["phosphorus_mg"],
                sodium_mg=entry["sodium_mg"],
                protein_g=entry["protein_g"],
                carbs_g=entry["carbs_g"],
                fat_g=entry["fat_g"],
                confidence=round(confidence * 0.8, 2),  # Slightly lower confidence for parsed items
            ))
        else:
            # Unknown food — return with zero nutrients and low confidence
            items.append(FoodItem(
                name=food_name.title(),
                portion_g=portion_g or 100,
                calories=0,
                potassium_mg=0,
                phosphorus_mg=0,
                sodium_mg=0,
                protein_g=0,
                carbs_g=0,
                fat_g=0,
                confidence=0.1,
            ))

    return ParseMealResponse(items=items, raw_text=text)