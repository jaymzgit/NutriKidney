from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from root .env
load_dotenv(Path(__file__).parent.parent / ".env")

from routers import auth, chat, food, logs, ocr, scan

app = FastAPI(title="CKD Smart Diet Assistant API")

#update CORS to allow API passthrough but deny random access/permissions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(chat.router, prefix="/chat")
app.include_router(food.router, prefix="/food")
app.include_router(logs.router, prefix="/logs")
app.include_router(ocr.router, prefix="/ocr")
app.include_router(scan.router, prefix="/scan")

@app.get("/")
async def main():
    return {"message": "backend server is up and running"}