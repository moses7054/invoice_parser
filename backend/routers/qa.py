"""
POST /qa — Q&A endpoint.

Routes the question through intent_router, then:
  - structured → fetch invoices from Supabase, ask LLM to answer (SQL mode)
  - semantic   → embed query, cosine similarity over invoice_embeddings, ask LLM (vector mode)
"""
import json
from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db.client as _db_client
from services.embedding_service import EmbeddingService
from services.intent_router import intent_router
from services.llm_service import LLMService

router = APIRouter(tags=["qa"])


class QARequest(BaseModel):
    question: str
    llm_provider: str = "anthropic"


class QAResponse(BaseModel):
    answer: str
    mode: Literal["sql", "vector"]
    sources: list


_SCHEMA_CONTEXT = """
Table: invoices
Columns: id (uuid), vendor_name (text), total_amount (numeric),
         currency (text), invoice_date (date), llm_provider (text), created_at (timestamptz)

Table: line_items
Columns: id (uuid), invoice_id (uuid FK→invoices.id), description (text),
         quantity (numeric), unit_price (numeric), amount (numeric), currency (text)
"""


def _as_vector(v) -> list[float]:
    """pgvector columns come back from PostgREST as a JSON string like
    '[0.1,0.2,...]'. Normalise to a list of floats."""
    if isinstance(v, str):
        return json.loads(v)
    return v


def _cosine_similarity(a, b) -> float:
    va, vb = np.array(_as_vector(a), dtype=float), np.array(_as_vector(b), dtype=float)
    denom = np.linalg.norm(va) * np.linalg.norm(vb) + 1e-8
    return float(np.dot(va, vb) / denom)


def _require_supabase():
    supabase = _db_client.supabase
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )
    return supabase


def _answer_structured(body: QARequest) -> QAResponse:
    """Feed all invoice rows to the LLM as JSON context (SQL mode)."""
    supabase = _require_supabase()
    result = (
        supabase.table("invoices")
        .select("id, vendor_name, total_amount, currency, invoice_date, llm_provider")
        .execute()
    )
    invoices = result.data or []
    source_ids = [str(inv["id"]) for inv in invoices]
    context = json.dumps(invoices, default=str)
    answer = LLMService().answer_question(
        question=body.question, context=context, provider=body.llm_provider,
    )
    return QAResponse(answer=answer, mode="sql", sources=source_ids)


def _answer_semantic(body: QARequest) -> QAResponse:
    """Embed the query, rank invoice_embeddings by cosine similarity (vector mode).
    Falls back to the structured path if embeddings are unavailable."""
    supabase = _require_supabase()

    emb_result = (
        supabase.table("invoice_embeddings")
        .select("invoice_id, chunk_text, embedding")
        .execute()
    )
    rows = emb_result.data or []
    if not rows:
        # No embeddings stored (e.g. no VOYAGE_API_KEY at upload) → use structured.
        return _answer_structured(body)

    query_vector = EmbeddingService().embed_query(body.question, provider=body.llm_provider)

    scored = [(_cosine_similarity(query_vector, row["embedding"]), row) for row in rows]
    scored.sort(key=lambda x: x[0], reverse=True)
    top_rows = [r for _, r in scored[:5]]

    context = "\n\n".join(r["chunk_text"] for r in top_rows)
    answer = LLMService().answer_question(
        question=body.question, context=context, provider=body.llm_provider,
    )

    seen, source_ids = set(), []
    for r in top_rows:
        iid = str(r["invoice_id"])
        if iid not in seen:
            seen.add(iid)
            source_ids.append(iid)

    return QAResponse(answer=answer, mode="vector", sources=source_ids)


@router.post("", response_model=QAResponse)
def ask_question(body: QARequest):
    mode = intent_router(body.question)
    if mode == "structured":
        return _answer_structured(body)
    # Semantic — but fall back to structured if anything in the vector path fails
    # (missing embeddings, invalid embedding key, etc.) so the demo never errors.
    try:
        return _answer_semantic(body)
    except Exception as exc:
        import logging
        logging.warning("Semantic path failed, falling back to structured: %s", exc)
        return _answer_structured(body)
