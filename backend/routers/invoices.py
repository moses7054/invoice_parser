"""
POST /invoices/upload — receive an invoice file, parse it with pdfplumber/Pillow+pytesseract,
extract structured data via LLM, persist to Supabase, and return the result.
GET  /sample-invoices — list available sample invoice files.
POST /invoices/upload-sample — run the full pipeline on a bundled sample file.
"""
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db.client import supabase
from services.embedding_service import EmbeddingService
from services.llm_service import LLMService

router = APIRouter(prefix="/invoices", tags=["invoices"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}
ALLOWED_SAMPLE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

SAMPLE_DIR = Path(__file__).parent.parent.parent / "sample_invoices"

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _mime_to_suffix(mime_type: str) -> str:
    mapping = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
    }
    return mapping.get(mime_type, ".bin")


def _extract_text(file_path: str) -> str:
    """Extract text from a PDF or image. Falls back to reading the file as
    plain text if the binary parser fails (e.g. the bundled text-based samples)."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    try:
        if suffix == ".pdf":
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                text = "\n\n".join(page.extract_text() or "" for page in pdf.pages)
        else:
            from PIL import Image
            import pytesseract
            text = pytesseract.image_to_string(Image.open(file_path))
        if text.strip():
            return text
    except Exception:
        pass
    # Fallback: treat the file as UTF-8 text.
    return Path(file_path).read_text(encoding="utf-8", errors="ignore")


# Control chars (incl. NUL) are rejected by PostgreSQL and break the HTTP/2
# stream to Supabase. Strip everything below 0x20 except tab/newline/return.
_CONTROL_CHARS = {c for c in range(0x20)} - {0x09, 0x0A, 0x0D}
_CONTROL_TABLE = {c: None for c in _CONTROL_CHARS} | {0x00: None}


def _sanitize(value):
    """Recursively strip NUL/control chars from strings and drop NaN/Inf floats."""
    import math

    if isinstance(value, str):
        return value.translate(_CONTROL_TABLE)
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    if isinstance(value, dict):
        return {k: _sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize(v) for v in value]
    return value


def _run_pipeline(file_path: str, llm_provider: str) -> JSONResponse:
    """Shared pipeline: parse text → LLM extract → Supabase store → return JSON."""
    raw_text = _extract_text(file_path)

    extracted: dict = LLMService().extract_invoice(raw_text, provider=llm_provider)
    line_items_data: list = extracted.pop("line_items", [])

    invoice_record = _sanitize({
        **extracted,
        "raw_text": raw_text,
        "llm_provider": llm_provider,
    })

    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )

    insert_result = supabase.table("invoices").insert(invoice_record).execute()
    saved_invoice = insert_result.data[0]
    invoice_id = saved_invoice["id"]

    saved_line_items = []
    for item in line_items_data:
        item_record = _sanitize({**item, "invoice_id": invoice_id})
        li_result = supabase.table("line_items").insert(item_record).execute()
        saved_line_items.append(li_result.data[0])

    # Generate and store embeddings for semantic search. Non-fatal: the invoice
    # is already saved, so an embedding-provider failure (e.g. missing/invalid
    # VOYAGE_API_KEY) must not fail the whole upload — only semantic Q&A degrades.
    try:
        embedding_svc = EmbeddingService()
        chunks = embedding_svc.chunk_text(raw_text)
        embeddings = embedding_svc.embed_chunks(chunks, provider=llm_provider)
        for chunk_text, embedding in zip(chunks, embeddings):
            supabase.table("invoice_embeddings").insert(
                {
                    "invoice_id": invoice_id,
                    "chunk_text": _sanitize(chunk_text),
                    "embedding": embedding,
                }
            ).execute()
    except Exception as exc:
        import logging
        logging.warning("Embedding generation skipped for invoice %s: %s", invoice_id, exc)

    return JSONResponse(content={**saved_invoice, "line_items": saved_line_items})


# ---------------------------------------------------------------------------
# POST /invoices/upload — file upload  (must be before /{invoice_id} wildcard)
# ---------------------------------------------------------------------------


@router.post("/upload")
async def upload_invoice(
    file: UploadFile,
    llm_provider: Optional[str] = Form(default="anthropic"),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: PDF, JPEG, PNG.",
        )
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(file_bytes)} bytes). Maximum allowed is 10 MB.",
        )
    suffix = _mime_to_suffix(content_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        return _run_pipeline(tmp_path, llm_provider or "anthropic")
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# POST /invoices/upload-sample — one-click demo (must be before /{invoice_id})
# ---------------------------------------------------------------------------


class SampleUploadRequest(BaseModel):
    sample_filename: str
    llm_provider: str = "anthropic"


@router.post("/upload-sample")
def upload_sample_invoice(body: SampleUploadRequest):
    filename = body.sample_filename
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename. Path traversal is not allowed.")
    target = (SAMPLE_DIR / filename).resolve()
    try:
        target.relative_to(SAMPLE_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename. Path traversal is not allowed.")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Sample file '{filename}' not found.")
    if target.suffix.lower() not in ALLOWED_SAMPLE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported sample file type '{target.suffix}'.")
    return _run_pipeline(str(target), body.llm_provider)


# ---------------------------------------------------------------------------
# GET /invoices — list all invoices
# ---------------------------------------------------------------------------


@router.get("")
def list_invoices():
    """Return all invoices ordered by created_at descending."""
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )
    result = (
        supabase.table("invoices")
        .select("id, vendor_name, invoice_date, total_amount, currency, llm_provider, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


# ---------------------------------------------------------------------------
# GET /invoices/{invoice_id} — single invoice with line items
# ---------------------------------------------------------------------------


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str):
    """Return a single invoice with its line items. 404 if not found."""
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )
    invoice_result = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .execute()
    )
    if not invoice_result.data:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    invoice = invoice_result.data[0]

    line_items_result = (
        supabase.table("line_items")
        .select("*")
        .eq("invoice_id", invoice_id)
        .execute()
    )
    invoice["line_items"] = line_items_result.data

    return invoice


