"""
rag/config.py — central configuration (all from env, all $0 tiers).

Required for RAG:
  SUPABASE_URL, SUPABASE_KEY        — already used by the rest of the backend
  CHAT_PROVIDER                     — gemini | groq | openrouter (or auto-detect)
  <PROVIDER>_API_KEY                — GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY

Embeddings run locally via fastembed (ONNX, no API cost). The model must match
the dimension of kb_chunks.embedding in schema.sql (default: MiniLM, 384).
"""

import os

# ── Embeddings (local, free) ──────────────────────────
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBED_DIM = int(os.getenv("EMBED_DIM", "384"))

# ── Retrieval ─────────────────────────────────────────
TOP_K = int(os.getenv("RAG_TOP_K", "6"))
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.25"))

# ── Chunking ──────────────────────────────────────────
CHUNK_MAX_CHARS = int(os.getenv("RAG_CHUNK_MAX_CHARS", "2200"))   # ~500-600 tokens
CHUNK_OVERLAP_CHARS = int(os.getenv("RAG_CHUNK_OVERLAP", "250"))  # ~15%

# ── LLM providers (free hosted tiers) ─────────────────
# Order tried when CHAT_PROVIDER is unset/unknown.
LLM_PROVIDERS = ("gemini", "groq", "openrouter")

DEFAULT_MODELS = {
    "gemini": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    "groq": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "openrouter": os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
}

LLM_TIMEOUT_S = float(os.getenv("CHAT_TIMEOUT_S", "30"))
LLM_MAX_TOKENS = int(os.getenv("CHAT_MAX_TOKENS", "900"))
LLM_TEMPERATURE = float(os.getenv("CHAT_TEMPERATURE", "0.3"))

# ── Rate limiting (per user, in-process) ──────────────
RATE_LIMIT_PER_HOUR = int(os.getenv("CHAT_RATE_LIMIT", "20"))

# ── Chat history sent to the LLM ──────────────────────
MAX_HISTORY_TURNS = int(os.getenv("CHAT_MAX_HISTORY", "8"))


def api_key_for(provider: str) -> str:
    return os.getenv(f"{provider.upper()}_API_KEY", "")


def resolve_provider() -> tuple[str, str]:
    """Return (provider, api_key). Raises RuntimeError when nothing is configured."""
    requested = os.getenv("CHAT_PROVIDER", "auto").lower()
    candidates = [requested] if requested in LLM_PROVIDERS else list(LLM_PROVIDERS)
    for p in candidates:
        key = api_key_for(p)
        if key:
            return p, key
    raise RuntimeError(
        "No LLM API key set. Add one of GEMINI_API_KEY / GROQ_API_KEY / "
        "OPENROUTER_API_KEY to backend/.env (free tiers), or set CHAT_PROVIDER."
    )
