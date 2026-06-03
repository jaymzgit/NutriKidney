"""
routers/ocr.py

OCR endpoints for extracting lab values from report images/PDFs.

This is a placeholder for Phase 3 — full OCR integration will use
Google Vision API or Tesseract to extract eGFR, creatinine, etc.
from uploaded lab report documents.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class OcrResult(BaseModel):
    egfr: Optional[float] = None
    creatinine: Optional[float] = None
    potassium: Optional[float] = None
    phosphorus: Optional[float] = None
    raw_text: str = ""
    confidence: float = 0.0

@router.post("/extract", response_model=OcrResult)
async def extract_lab_values(file: UploadFile = File(...)):
    """
    Extract lab values from an uploaded report image or PDF.
    Currently returns a placeholder response — full OCR coming in Phase 3.
    """
    if not file.content_type:
        raise HTTPException(status_code=400, detail="File type not detected")

    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(allowed_types)}"
        )

    # Read file (for future processing)
    _contents = await file.read()

    # Placeholder: return empty results
    # Phase 3 will implement actual OCR here
    return OcrResult(
        raw_text="[OCR not yet implemented — Phase 3]",
        confidence=0.0,
    )