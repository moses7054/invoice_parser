"""
POST /qa — Q&A endpoint.

Routes the question through intent_router, then:
  - structured → fetch invoices from Supabase, ask LLM to answer
  - semantic   → placeholder (Issue #5)
"""
import json
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db.client as _db_client
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

    # semantic — Issue #5 will implement vector search
    return QAResponse(
        answer="Semantic search not yet implemented",
        mode="vector",
        sources=[],
    )
