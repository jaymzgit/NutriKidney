"""
rag/ingest.py — one-off CLI: parse documents → chunk → embed → store.

Run from the backend/ directory (so `rag` is importable):

    python -m rag.ingest knowledge/
    python -m rag.ingest knowledge/cpg_ckd.pdf knowledge/myfcd_tables.md
    python -m rag.ingest --dry-run knowledge/          # chunk only, no DB writes
    python -m rag.ingest --replace knowledge/nkf.pdf   # drop old chunks first

Supported: .pdf, .md, .txt, .markdown
Env: same backend/.env (SUPABASE_URL, SUPABASE_KEY) — embeddings are local.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rag.chunking import chunk_paths
from rag.config import EMBED_MODEL
from rag.embed import embed_texts


def collect(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files.extend(
                sorted(
                    f for f in p.rglob("*")
                    if f.suffix.lower() in {".pdf", ".md", ".txt", ".markdown"}
                )
            )
        elif p.is_file():
            files.append(p)
        else:
            print(f"  ! not found: {p}", file=sys.stderr)
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingest CKD documents into kb_chunks")
    ap.add_argument("paths", nargs="+", type=Path, help="files or folders")
    ap.add_argument("--dry-run", action="store_true", help="chunk + count, no writes")
    ap.add_argument(
        "--replace", action="store_true",
        help="delete existing chunks for each ingested source first",
    )
    args = ap.parse_args()

    files = collect(args.paths)
    if not files:
        print("No supported files found (.pdf/.md/.txt).", file=sys.stderr)
        return 1
    print(f"Found {len(files)} file(s). Embedding model: {EMBED_MODEL}")

    chunks, errors = chunk_paths(files)
    for e in errors:
        print(f"  ! {e}", file=sys.stderr)
    if not chunks:
        print("No chunks produced — nothing to ingest.", file=sys.stderr)
        return 1

    # Sanity-check chunk sizes before spending time on embedding.
    sizes = sorted(len(c.text) for c in chunks)
    print(
        f"Chunked {len(chunks)} chunks "
        f"(median {sizes[len(sizes) // 2]} chars, max {sizes[-1]} chars)"
    )

    if args.dry_run:
        for c in chunks[:5]:
            head = c.text[:100].replace("\n", " ")
            print(f"  - [{c.source} p.{c.page or '-'}] {head}…")
        print("Dry run — nothing written.")
        return 0

    from rag import store  # lazy: dry-run shouldn't require SUPABASE_* env

    if store.count_chunks() == 0:
        print(
            "\n! kb_chunks is empty/inaccessible — run rag/schema.sql in the "
            "Supabase SQL editor first (see backend/knowledge/README.md).",
            file=sys.stderr,
        )
        return 1

    total = 0
    by_source = {c.source for c in chunks}
    for source in sorted(by_source):
        group = [c for c in chunks if c.source == source]
        if args.replace:
            store.delete_source(source)
        embs = embed_texts([c.text for c in group])
        total += store.upsert_chunks(group, embs)
        print(f"  ✓ {source}: {len(group)} chunks")

    print(f"Done — {total} chunks stored. {store.count_chunks()} total in kb_chunks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
