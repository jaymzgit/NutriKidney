"""RAG package — ingestion, retrieval, and LLM answering for the CKD chatbot.

Run ingestion from the backend/ directory:

    python -m rag.ingest ../backend/knowledge          # a folder
    python -m rag.ingest cpg_ckd.pdf notes.md          # explicit files
"""

__all__ = ["chunking", "embed", "store", "llm", "prompts", "ingest"]
