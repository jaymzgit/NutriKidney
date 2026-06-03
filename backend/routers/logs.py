"""
routers/logs.py

Meal log CRUD endpoints.

Endpoints:
  POST /logs/meals     — create a meal log with items
  GET  /logs/meals     — get today's meals for a user
  DELETE /logs/meals/{id} — delete a meal log
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from datetime import datetime, timezone

router = APIRouter()

# ── Supabase client ──────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Models ───────────────────────────────────────────

class MealItemInput(BaseModel):
    food_name: str
    portion_g: float = 0
    calories: float = 0
    potassium_mg: float = 0
    phosphorus_mg: float = 0
    sodium_mg: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    confidence: float = 1.0

class CreateMealRequest(BaseModel):
    user_id: str
    method: str  # 'scan' | 'voice' | 'manual'
    risk_level: Optional[str] = None  # 'safe' | 'caution' | 'danger'
    notes: Optional[str] = None
    items: list[MealItemInput]

class CreateMealResponse(BaseModel):
    meal_id: str
    items_count: int
    status: str

# ── POST /logs/meals ─────────────────────────────────

@router.post("/meals", response_model=CreateMealResponse)
async def create_meal(req: CreateMealRequest):
    """Create a meal log with food items."""
    if not req.items:
        raise HTTPException(status_code=400, detail="At least one food item is required")

    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Step 1: Insert meal_log
    meal_result = sb.table("meal_logs").insert({
        "user_id": req.user_id,
        "method": req.method,
        "risk_level": req.risk_level,
        "notes": req.notes,
        "logged_at": now,
    }).execute()

    if not meal_result.data:
        raise HTTPException(status_code=500, detail="Failed to create meal log")

    meal_id = meal_result.data[0]["id"]

    # Step 2: Insert meal_items
    items_data = []
    for item in req.items:
        items_data.append({
            "meal_id": meal_id,
            "food_name": item.food_name,
            "portion_g": item.portion_g,
            "calories": item.calories,
            "potassium_mg": item.potassium_mg,
            "phosphorus_mg": item.phosphorus_mg,
            "sodium_mg": item.sodium_mg,
            "protein_g": item.protein_g,
            "carbs_g": item.carbs_g,
            "fat_g": item.fat_g,
            "confidence": item.confidence,
            "logged_at": now,
        })

    items_result = sb.table("meal_items").insert(items_data).execute()

    if not items_result.data:
        raise HTTPException(status_code=500, detail="Failed to create meal items")

    return CreateMealResponse(
        meal_id=meal_id,
        items_count=len(items_data),
        status="success",
    )