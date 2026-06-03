from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
def test_auth():
    return {"message": "auth router working, backend api test with FastAPI successful."}
