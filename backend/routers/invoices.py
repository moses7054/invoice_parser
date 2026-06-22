"""
POST /invoices/upload — receive an invoice file, parse it with Docling,
extract structured data via LLM, persist to Supabase, and return the result.
"""
import os
import tempfile
import uuid
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from db.client import supabase
from services.llm_service import LLMService

try:
    from docling.document_converter import DocumentConverter  # type: ignore
except ImportError:  # pragma: no cover – docling may not be installed in test env
    DocumentConverter = None  # type: ignore[assignment,misc]

router = APIRouter(prefix="/invoices", tags=["invoices"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}


@router.post("/upload")
async def upload_invoice(
    file: UploadFile,
    llm_provider: Optional[str] = Form(default="anthropic"),
):
    """
    Upload an invoice file (PDF or image), extract data with Docling + LLM,
    store to Supabase, and return the structured invoice record.
    """
    # --- Validate MIME type ---
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: PDF, JPEG, PNG.",
        )

    # --- Read and validate file size ---
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(file_bytes)} bytes). Maximum allowed is 10 MB.",
        )

    # --- Extract text with Docling ---
    suffix = _mime_to_suffix(content_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        converter = DocumentConverter()
        result = converter.convert(tmp_path)
        raw_text = result.document.export_to_markdown()
    finally:
        os.unlink(tmp_path)

    # --- Extract invoice fields via LLM ---
    extracted: dict = LLMService().extract_invoice(raw_text, provider=llm_provider)

    # --- Separate line items from top-level invoice fields ---
    line_items_data: list = extracted.pop("line_items", [])

    # Build the invoice record to insert (include raw_text and llm_provider)
    invoice_record = {
        **extracted,
        "raw_text": raw_text,
        "llm_provider": llm_provider,
    }

    # --- Persist to Supabase ---
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable — SUPABASE_URL / SUPABASE_KEY not configured.",
        )

    insert_result = supabase.table("invoices").insert(invoice_record).execute()
    saved_invoice = insert_result.data[0]
    invoice_id = saved_invoice["id"]

    # Insert line items
    saved_line_items = []
    for item in line_items_data:
        item_record = {**item, "invoice_id": invoice_id}
        li_result = supabase.table("line_items").insert(item_record).execute()
        saved_line_items.append(li_result.data[0])

    # --- Build and return full response ---
    response_body = {**saved_invoice, "line_items": saved_line_items}
    return JSONResponse(content=response_body)


def _mime_to_suffix(mime_type: str) -> str:
    mapping = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
    }
    return mapping.get(mime_type, ".bin")
