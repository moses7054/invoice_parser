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


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=float), np.array(b, dtype=float)
    denom = np.linalg.norm(va) * np.linalg.norm(vb) + 1e-8
    return float(np.dot(va, vb) / denom)


@router.post("", response_model=QAResponse)
def ask_question(body: QARequest):
    mode = intent_router(body.question)

    if mode == "structured":
        supabase = _db_client.supabase
        if supabase is None:
            raise HTTPException(
                status_code=503,
                detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
            )

        result = (
            supabase.table("invoices")
            .select("id, vendor_name, total_amount, currency, invoice_date, llm_provider")
            .execute()
        )
        invoices = result.data or []
        source_ids = [str(inv["id"]) for inv in invoices]

        context = json.dumps(invoices, default=str)
        answer = LLMService().answer_question(
            question=body.question,
            context=context,
            provider=body.llm_provider,
        )

        return QAResponse(answer=answer, mode="sql", sources=source_ids)

    # -------------------------------------------------------------------------
    # Semantic / vector path
    # -------------------------------------------------------------------------
    supabase = _db_client.supabase
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )

    # 1. Embed the query
    embedding_svc = EmbeddingService()
    query_vector = embedding_svc.embed_query(body.question, provider=body.llm_provider)

    # 2. Fetch all embedding rows and rank by cosine similarity in Python
    emb_result = (
        supabase.table("invoice_embeddings")
        .select("invoice_id, chunk_text, embedding")
        .execute()
    )
    rows = emb_result.data or []

    scored = []
    for row in rows:
        sim = _cosine_similarity(query_vector, row["embedding"])
        scored.append((sim, row))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_rows = [r for _, r in scored[:5]]

    # 3. Build context from top chunks
    context_chunks = [r["chunk_text"] for r in top_rows]
    context = "\n\n".join(context_chunks)

    # 4. Ask LLM with retrieved context
    answer = LLMService().answer_question(
        question=body.question,
        context=context,
        provider=body.llm_provider,
    )

    # 5. Deduplicated source invoice IDs
    seen = set()
    source_ids = []
    for r in top_rows:
        iid = str(r["invoice_id"])
        if iid not in seen:
            seen.add(iid)
            source_ids.append(iid)

    return QAResponse(answer=answer, mode="vector", sources=source_ids)
