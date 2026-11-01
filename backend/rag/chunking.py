"""
rag/chunking.py — parse documents into retrieval-sized chunks.

Supported inputs:
  .md / .txt  — read directly, split on headings then size
  .pdf        — extracted page-by-page with pypdf (page numbers kept for citations)

Chunking strategy: heading-aware packing.
  1. Split into sections at markdown headings (or per page for PDFs).
  2. Greedily pack whole paragraphs into chunks up to CHUNK_MAX_CHARS.
  3. Overlap the tail of each chunk into the next so answers spanning a
     boundary still retrieve.
Large paragraphs (> CHUNK_MAX_CHARS) are hard-split on sentence boundaries.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from rag.config import CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS

HEADING_RE = re.compile(r"^(#{1,4}\s+.+|[A-Z0-9][A-Z0-9 .:,'()/&-]{5,})$", re.M)
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


@dataclass
class Chunk:
    text: str
    source: str          # file name shown in citations
    page: int | None = None     # PDF page (1-based) when known
    heading: str | None = None   # nearest heading / section title
    meta: dict = field(default_factory=dict)


def _pack(sections: list[tuple[str, str, int | None]], source: str) -> list[Chunk]:
    """sections: (heading, text, page) → sized chunks with overlap."""
    chunks: list[Chunk] = []
    for heading, text, page in sections:
        paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        buf = ""

        def flush():
            nonlocal buf
            if buf.strip():
                chunks.append(Chunk(text=buf.strip(), source=source, page=page, heading=heading))
            buf = ""

        for para in paras:
            # Oversized paragraph: split on sentences so nothing exceeds the cap.
            if len(para) > CHUNK_MAX_CHARS:
                flush()
                sentences = SENTENCE_RE.split(para)
                current = ""
                for s in sentences:
                    if len(current) + len(s) + 1 > CHUNK_MAX_CHARS:
                        chunks.append(Chunk(text=current.strip(), source=source, page=page, heading=heading))
                        current = ""
                    current = f"{current} {s}".strip()
                buf = current
                continue

            if len(buf) + len(para) + 2 > CHUNK_MAX_CHARS:
                flush()
            buf = f"{buf}\n\n{para}" if buf else para

        flush()

        # Overlap: prepend the tail of the previous chunk from this source.
    for i in range(1, len(chunks)):
        prev_tail = chunks[i - 1].text[-CHUNK_OVERLAP_CHARS:]
        if chunks[i].source == chunks[i - 1].source:
            # Only overlap when it doesn't cross a heading boundary.
            if chunks[i].heading == chunks[i - 1].heading:
                chunks[i].text = f"...{prev_tail}\n\n{chunks[i].text}"
    return chunks


def _split_sections(text: str) -> list[tuple[str, str]]:
    """Split markdown-ish text at headings. Returns (heading, body) pairs."""
    matches = list(HEADING_RE.finditer(text))
    if not matches:
        return [("", text)]

    sections: list[tuple[str, str]] = []
    # Text before the first heading belongs to no section.
    if matches[0].start() > 0:
        prelude = text[: matches[0].start()].strip()
        if prelude:
            sections.append(("", prelude))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        heading = m.group(0).lstrip("#").strip()
        body = text[m.end() : end].strip()
        sections.append((heading, f"# {heading}\n{body}" if body else f"# {heading}"))
    return sections


def parse_pdf(path: Path) -> list[Chunk]:
    """Page-by-page extraction — page numbers preserved for citations."""
    from pypdf import PdfReader  # imported lazily: only needed at ingest time

    reader = PdfReader(str(path))
    sections: list[tuple[str, str, int | None]] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            # Use the first line as a pseudo-heading for very long PDFs.
            first_line = text.split("\n", 1)[0][:80]
            sections.append((first_line, text, i))
    return _pack(sections, source=path.name)


def chunk_file(path: Path) -> list[Chunk]:
    """Parse one file into chunks. Raises ValueError for unsupported types."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(path)
    if suffix in {".md", ".txt", ".markdown"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        sections = [(h, body, None) for h, body in _split_sections(text)]
        return _pack(sections, source=path.name)
    raise ValueError(f"Unsupported file type: {path.name} (use .pdf, .md, .txt)")


def chunk_paths(paths: list[Path]) -> tuple[list[Chunk], list[str]]:
    """Chunk every supported file; returns (chunks, errors)."""
    chunks: list[Chunk] = []
    errors: list[str] = []
    for p in paths:
        try:
            chunks.extend(chunk_file(p))
        except Exception as e:  # keep going: one bad PDF shouldn't abort a batch
            errors.append(f"{p.name}: {e}")
    return chunks, errors
