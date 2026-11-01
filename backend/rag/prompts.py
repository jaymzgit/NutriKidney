"""
rag/prompts.py — system prompt + context assembly.

Design rules:
  - Answer ONLY from retrieved context; admit when it isn't there.
  - Cite as [1], [2] … mapped to the source list the client renders.
  - CKD safety: no drug/dosing advice, defer to the care team, keep it
    Malaysia-aware (local foods, BM terms, hawker/takeaway realities).
  - The model never invents nutrient numbers — if the context lacks a value,
    it says so rather than guessing.
"""

from __future__ import annotations

from rag.config import MAX_HISTORY_TURNS

SYSTEM_TEMPLATE = """You are NutriKidney's diet assistant — a nutrition-knowledge \
assistant for people living with chronic kidney disease (CKD) in Malaysia.

Answer rules:
1. Use ONLY the provided context documents. If the context doesn't cover the \
question, say so plainly and suggest the user ask their dietitian — do not \
guess or use outside knowledge for medical specifics.
2. Cite supporting context inline as [1], [2] using the numbered sources given \
below. Every medical/nutrient claim must map to a citation.
3. Never invent nutrient numbers. Quote values only when they appear in the \
context; otherwise state they aren't in your sources.
4. No medication, dose, or dialysis-prescription advice. For anything clinical \
(binders, fluid rules, dialysis), defer to the user's kidney doctor/dietitian.
5. Be Malaysia-aware: discuss local foods by their common names (nasi lemak, \
sayur, ikan bilis, teh tarik), include BM terms where natural, and account for \
hawker/takeaway realities (sauces, coconut milk, salt).
6. CKD stage context: {stage_note}
7. Keep answers under ~180 words: practical, warm, non-judgemental. Use short \
paragraphs or a couple of bullet points. This is a phone chat.

{context_block}

{citations_block}"""


def build_stage_note(ckd_stage: str | None) -> str:
    if not ckd_stage:
        return (
            "The user hasn't set a CKD stage. Give general CKD dietary guidance "
            "and suggest they set their stage in Profile for tailored limits."
        )
    return (
        f"The user's CKD stage is {ckd_stage}. Tailor strictness to that stage "
        "and remind them their daily limits live on the Home screen."
    )


def build_context(chunks: list[dict]) -> tuple[str, str]:
    """Returns (context_block, citations_block) for the system prompt."""
    if not chunks:
        return (
            "Context: no relevant documents were retrieved for this question.",
            "Sources: none.",
        )
    numbered = []
    cites = []
    for i, c in enumerate(chunks, start=1):
        loc = f", p. {c['page']}" if c.get("page") else ""
        heading = f" — {c['heading']}" if c.get("heading") else ""
        numbered.append(f"[{i}] ({c['source']}{loc}{heading})\n{c['content']}")
        cites.append(f"[{i}] {c['source']}{loc}{heading}")
    return (
        "Retrieved context:\n\n" + "\n\n---\n\n".join(numbered),
        "Sources (cite with these numbers):\n" + "\n".join(cites),
    )


def build_messages(
    message: str,
    history: list[dict],
    ckd_stage: str | None,
    chunks: list[dict],
) -> tuple[str, list[dict]]:
    """Returns (system_prompt, chat_messages) ready for the LLM."""
    context_block, citations_block = build_context(chunks)
    system = SYSTEM_TEMPLATE.format(
        stage_note=build_stage_note(ckd_stage),
        context_block=context_block,
        citations_block=citations_block,
    )

    # Oldest→newest, capped, roles sanitized to user/assistant.
    cleaned = [
        {"role": "assistant" if m.get("role") == "assistant" else "user",
         "content": str(m.get("text") or m.get("content") or "")[:2000]}
        for m in history
        if (m.get("text") or m.get("content"))
    ][-MAX_HISTORY_TURNS:]
    cleaned.append({"role": "user", "content": message})
    return system, cleaned
