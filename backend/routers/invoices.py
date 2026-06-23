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
    """Extract plain text from a PDF or image file."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            return "\n\n".join(page.extract_text() or "" for page in pdf.pages)
    else:
        from PIL import Image
        import pytesseract
        return pytesseract.image_to_string(Image.open(file_path))


def _run_pipeline(file_path: str, llm_provider: str) -> JSONResponse:
    """Shared pipeline: parse text → LLM extract → Supabase store → return JSON."""
    raw_text = _extract_text(file_path)

    extracted: dict = LLMService().extract_invoice(raw_text, provider=llm_provider)
    line_items_data: list = extracted.pop("line_items", [])

    invoice_record = {
        **extracted,
        "raw_text": raw_text,
        "llm_provider": llm_provider,
    }

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
        item_record = {**item, "invoice_id": invoice_id}
        li_result = supabase.table("line_items").insert(item_record).execute()
        saved_line_items.append(li_result.data[0])

    # Generate and store embeddings for semantic search
    embedding_svc = EmbeddingService()
    chunks = embedding_svc.chunk_text(raw_text)
    embeddings = embedding_svc.embed_chunks(chunks, provider=llm_provider)
    for chunk_text, embedding in zip(chunks, embeddings):
        supabase.table("invoice_embeddings").insert(
            {
                "invoice_id": invoice_id,
                "chunk_text": chunk_text,
                "embedding": embedding,
            }
        ).execute()

    return JSONResponse(content={**saved_invoice, "line_items": saved_line_items})


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


# ---------------------------------------------------------------------------
# POST /invoices/upload — file upload
# ---------------------------------------------------------------------------


@router.post("/upload")
async def upload_invoice(
    file: UploadFile,
    llm_provider: Optional[str] = Form(default="anthropic"),
):
    """
    Upload an invoice file (PDF or image), extract data with Docling + LLM,
    store to Supabase, and return the structured invoice record.
    """
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
# GET /sample-invoices — list bundled sample files (note: NOT under /invoices prefix)
# ---------------------------------------------------------------------------

# This route is registered at the app level (not inside /invoices prefix).
# We expose it via a separate small router so it lives at /sample-invoices.


# ---------------------------------------------------------------------------
# POST /invoices/upload-sample — one-click demo with a bundled file
# ---------------------------------------------------------------------------


class SampleUploadRequest(BaseModel):
    sample_filename: str
    llm_provider: str = "anthropic"


@router.post("/upload-sample")
def upload_sample_invoice(body: SampleUploadRequest):
    """
    Run the full invoice pipeline on one of the bundled sample files.
    Validates that the filename doesn't escape the sample_invoices/ directory.
    """
    filename = body.sample_filename

    # Path traversal protection: reject filenames with separators or parent-dir refs
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename. Path traversal is not allowed.",
        )

    target = (SAMPLE_DIR / filename).resolve()

    # Double-check resolved path stays inside SAMPLE_DIR
    try:
        target.relative_to(SAMPLE_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename. Path traversal is not allowed.",
        )

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Sample file '{filename}' not found.")

    if target.suffix.lower() not in ALLOWED_SAMPLE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported sample file type '{target.suffix}'.",
        )

    return _run_pipeline(str(target), body.llm_provider)
