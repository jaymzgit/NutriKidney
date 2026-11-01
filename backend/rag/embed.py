"""
rag/embed.py — local embeddings via fastembed (ONNX, no API cost).

Why fastembed over sentence-transformers: no PyTorch (~2 GB image build),
CPU-only, ~90 MB model download cached on first run.

IMPORTANT: the same model/dimension must be used at ingest and query time.
It's configured once in rag/config.py (EMBED_MODEL / EMBED_DIM).
"""

from __future__ import annotations

from rag.config import EMBED_MODEL

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
        except ImportError as e:
            raise RuntimeError(
                "fastembed is not installed. Run: pip install fastembed"
            ) from e
        _model = TextEmbedding(model_name=EMBED_MODEL)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Empty input returns empty output (no model load)."""
    if not texts:
        return []
    model = _get_model()
    return [list(map(float, v)) for v in model.embed(texts)]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
