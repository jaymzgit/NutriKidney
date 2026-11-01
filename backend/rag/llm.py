"""
rag/llm.py — chat completion against a free-tier hosted LLM.

Providers (all have $0 developer tiers, all plain HTTP — no SDKs):
  gemini      — Google AI Studio     (GEMINI_API_KEY)
  groq        — Groq                 (GROQ_API_KEY)
  openrouter  — OpenRouter :free     (OPENROUTER_API_KEY)

Selected by CHAT_PROVIDER or auto-detected from whichever key exists
(see rag/config.resolve_provider). Raise on failure so the caller can fall
back to the canned mock — never surface a stack trace to the user.
"""

from __future__ import annotations

import httpx

from rag.config import (
    DEFAULT_MODELS,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
    LLM_TIMEOUT_S,
    resolve_provider,
)


def complete(system: str, messages: list[dict]) -> str:
    """messages: [{"role": "user"|"assistant", "content": str}]. Returns text."""
    provider, key = resolve_provider()
    model = DEFAULT_MODELS[provider]

    if provider == "gemini":
        return _gemini(system, messages, key, model)
    return _openai_compat(provider, messages, key, model)


def provider_name() -> str:
    """For logs/eval output — never sent to the client."""
    try:
        return resolve_provider()[0]
    except RuntimeError:
        return "none"


# ── Google AI Studio (Gemini) ─────────────────────────

def _gemini(system: str, messages: list[dict], key: str, model: str) -> str:
    # Gemini uses a distinct systemInstruction slot and alternate role names.
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": LLM_MAX_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    )
    resp = httpx.post(
        url,
        json=payload,
        headers={"x-goog-api-key": key},
        timeout=LLM_TIMEOUT_S,
    )
    resp.raise_for_status()
    candidates = resp.json().get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned empty text")
    return text


# ── Groq / OpenRouter (OpenAI-compatible) ─────────────

def _openai_compat(provider: str, messages: list[dict], key: str, model: str) -> str:
    base = {
        "groq": "https://api.groq.com/openai/v1",
        "openrouter": "https://openrouter.ai/api/v1",
    }[provider]
    resp = httpx.post(
        f"{base}/chat/completions",
        json={
            "model": model,
            "messages": messages,
            "max_tokens": LLM_MAX_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
        headers={"Authorization": f"Bearer {key}"},
        timeout=LLM_TIMEOUT_S,
    )
    resp.raise_for_status()
    choices = resp.json().get("choices", [])
    if not choices:
        raise RuntimeError(f"{provider} returned no choices")
    text = (choices[0].get("message") or {}).get("content", "").strip()
    if not text:
        raise RuntimeError(f"{provider} returned empty text")
    return text
