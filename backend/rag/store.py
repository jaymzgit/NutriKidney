"""
rag/store.py — Supabase pgvector storage for knowledge chunks.

Schema lives in rag/schema.sql (run once in the Supabase SQL editor):
  - kb_chunks table with a vector(384) column
  - match_chunks() RPC doing cosine similarity + threshold + limit
"""

from __future__ import annotations

import os

from supabase import Client, create_client

from rag.chunking import Chunk
from rag.config import EMBED_DIM, SIMILARITY_THRESHOLD, TOP_K

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_KEY not set in backend/.env")
        _client = create_client(url, key)
    return _client


def count_chunks() -> int:
    """0 also means 'schema.sql not run yet' — callers surface setup hints."""
    try:
        res = get_client().table("kb_chunks").select("id", count="exact").limit(1).execute()
        return int(res.count or 0)
    except Exception:
        return 0


def delete_source(source: str) -> None:
    """Remove previous chunks of a document so re-ingesting replaces it."""
    get_client().table("kb_chunks").delete().eq("source", source).execute()


def upsert_chunks(chunks: list[Chunk], embeddings: list[list[float]]) -> int:
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings length mismatch")
    rows = [
        {
            "content": c.text,
            "source": c.source,
            "page": c.page,
            "heading": c.heading,
            "embedding": emb,
        }
        for c, emb in zip(chunks, embeddings)
    ]
    # Batch to keep request bodies sane.
    batch = 50
    for i in range(0, len(rows), batch):
        get_client().table("kb_chunks").insert(rows[i : i + batch]).execute()
    return len(rows)


def match(query_embedding: list[float], top_k: int = TOP_K) -> list[dict]:
    """Cosine-similarity search via the match_chunks RPC.

    Returns rows: {id, content, source, page, heading, similarity}.
    """
    res = get_client().rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "match_threshold": SIMILARITY_THRESHOLD,
        },
    ).execute()
    return list(res.data or [])
