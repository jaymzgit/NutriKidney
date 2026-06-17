"""
routers/logs.py

Meal log CRUD endpoints.

Endpoints:
  POST   /logs/meals       — create a meal log with items
  GET    /logs/meals       — get meals for the authenticated user
  DELETE /logs/meals/{id}  — delete a meal log
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from datetime import datetime, timezone

from routers.auth import get_current_user

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

class MealItemOut(MealItemInput):
    id: str

class CreateMealRequest(BaseModel):
    method: str  # 'scan' | 'voice' | 'manual'
    risk_level: Optional[str] = None  # 'safe' | 'caution' | 'danger'
    notes: Optional[str] = None
    items: list[MealItemInput]

class CreateMealResponse(BaseModel):
    meal_id: str
    items_count: int
    status: str

class MealOut(BaseModel):
    id: str
    method: str
    risk_level: Optional[str] = None
    notes: Optional[str] = None
    logged_at: str
    meal_items: list[MealItemOut] = []

    # Computed totals for convenience
    total_calories: float = 0
    total_potassium: float = 0
    total_phosphorus: float = 0
    total_sodium: float = 0
    total_protein: float = 0

# ── POST /logs/meals ─────────────────────────────────

@router.post("/meals", response_model=CreateMealResponse)
async def create_meal(req: CreateMealRequest, user_id: str = Depends(get_current_user)):
    """Create a meal log with food items."""
    if not req.items:
        raise HTTPException(status_code=400, detail="At least one food item is required")

    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    meal_result = sb.table("meal_logs").insert({
        "user_id": user_id,
        "method": req.method,
        "risk_level": req.risk_level,
        "notes": req.notes,
        "logged_at": now,
    }).execute()

    if not meal_result.data:
        raise HTTPException(status_code=500, detail="Failed to create meal log")

    meal_id = meal_result.data[0]["id"]

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

# ── GET /logs/meals ──────────────────────────────────

@router.get("/meals", response_model=list[MealOut])
async def get_meals(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD). Omit for all meals."),
    user_id: str = Depends(get_current_user),
):
    """Get meals for the authenticated user, optionally filtered by date."""
    sb = get_supabase()

    query = sb.table("meal_logs").select(
        "id, method, risk_level, notes, logged_at, meal_items(*)"
    ).eq("user_id", user_id).order("logged_at", desc=True)

    if date:
        query = query.gte("logged_at", f"{date}T00:00:00Z").lt("logged_at", f"{date}T23:59:59Z")

    result = query.execute()

    meals = []
    for row in result.data or []:
        items = row.get("meal_items") or []
        meals.append(MealOut(
            id=row["id"],
            method=row["method"],
            risk_level=row.get("risk_level"),
            notes=row.get("notes"),
            logged_at=row["logged_at"],
            meal_items=items,
            total_calories=sum(i.get("calories", 0) for i in items),
            total_potassium=sum(i.get("potassium_mg", 0) for i in items),
            total_phosphorus=sum(i.get("phosphorus_mg", 0) for i in items),
            total_sodium=sum(i.get("sodium_mg", 0) for i in items),
            total_protein=sum(i.get("protein_g", 0) for i in items),
        ))

    return meals

# ── DELETE /logs/meals/{meal_id} ─────────────────────

@router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str, user_id: str = Depends(get_current_user)):
    """Delete a meal log and its items. Only the owner can delete."""
    sb = get_supabase()

    # Verify ownership
    check = sb.table("meal_logs").select("id").eq("id", meal_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Delete items first (foreign key), then the meal
    sb.table("meal_items").delete().eq("meal_id", meal_id).execute()
    sb.table("meal_logs").delete().eq("id", meal_id).execute()

    return {"status": "deleted", "meal_id": meal_id}
