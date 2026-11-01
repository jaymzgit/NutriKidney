"""
routers/chat.py — RAG chat endpoint for the CKD diet assistant.

POST /chat { message, history[], ckd_stage }
  1. embed the question (local fastembed)
  2. pgvector top-k over kb_chunks
  3. free-tier LLM with retrieved context + stage personalization
  4. return { reply, citations[] }

Degrades gracefully at every stage:
  - knowledge base unreachable / empty → LLM answers with "no context" rule
  - LLM quota/timeout/misconfigured     → HTTP 503 with `retryable: true`,
    the client falls back to its canned replies
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from routers.auth import get_current_user
from rag import llm, store
from rag.config import RATE_LIMIT_PER_HOUR, TOP_K
from rag.embed import embed_query
from rag.prompts import build_messages

router = APIRouter()

# ── Request/response models ───────────────────────────

class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = []
    ckd_stage: Optional[str] = None


class Citation(BaseModel):
    ref: int
    source: str
    page: Optional[int] = None
    heading: Optional[str] = None
    snippet: str  # short excerpt shown in the UI chip


class ChatResponse(BaseModel):
    reply: str
    citations: list[Citation] = []
    retrieval: str  # "ok" | "no_context" | "kb_unavailable"
    provider: str


# ── In-process per-user rate limit ────────────────────
# Fine for a single worker; swap for Redis/Postgres if the backend scales out.
_hits: dict[str, deque] = defaultdict(deque)


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    window = _hits[user_id]
    while window and now - window[0] > 3600:
        window.popleft()
    if len(window) >= RATE_LIMIT_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit: {RATE_LIMIT_PER_HOUR} messages/hour. Try again later.",
        )
    window.append(now)


# ── POST /chat ────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    _check_rate_limit(user_id)

    # 1–2. Retrieval (embedding local, search via match_chunks RPC).
    chunks: list[dict] = []
    retrieval = "ok"
    try:
        hits = store.match(embed_query(req.message), top_k=TOP_K)
        chunks = [
            {
                "content": h["content"],
                "source": h["source"],
                "page": h.get("page"),
                "heading": h.get("heading"),
            }
            for h in hits
        ]
        if not chunks:
            # Distinguish "kb never ingested" from "query simply matched nothing".
            retrieval = "no_context" if store.count_chunks() > 0 else "kb_unavailable"
    except Exception as e:  # schema.sql not run, DB down, embedding missing
        print(f"[chat] retrieval failed: {e}")
        retrieval = "kb_unavailable"

    # 3. Answer.
    system, messages = build_messages(
        message=req.message,
        history=[t.model_dump() for t in req.history],
        ckd_stage=req.ckd_stage,
        chunks=chunks,
    )
    try:
        reply = llm.complete(system, messages)
    except RuntimeError as e:
        # Misconfiguration (no API key) or quota/provider failure.
        print(f"[chat] LLM failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Assistant temporarily unavailable — check backend/.env LLM key or free-tier quota.",
            headers={"Retry-After": "60"},
        )
    except Exception as e:
        print(f"[chat] LLM error: {e}")
        raise HTTPException(status_code=502, detail="LLM request failed.")

    # 4. Citations — numbered to match the [1] markers in the prompt/reply.
    citations = []
    for i, c in enumerate(chunks, start=1):
        snippet = " ".join(c["content"].split())[:160]
        citations.append(
            Citation(
                ref=i,
                source=c["source"],
                page=c.get("page"),
                heading=c.get("heading"),
                snippet=snippet,
            )
        )

    return ChatResponse(
        reply=reply,
        citations=citations,
        retrieval=retrieval,
        provider=llm.provider_name(),
    )
