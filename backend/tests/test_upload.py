"""
Integration test: POST /invoices/upload extracts invoice data via mocked Docling + LLM.
No real Supabase credentials or LLM calls are made.
"""
import io
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

FIXTURE_INVOICE_DICT = {
    "invoice_number": "INV-001",
    "vendor_name": "Test Vendor",
    "vendor_address": "123 Main St",
    "bill_to": "Acme Corp",
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-15",
    "subtotal": 90.0,
    "tax_amount": 10.0,
    "tax_rate": 0.1,
    "total_amount": 100.0,
    "currency": "USD",
    "payment_terms": "Net 30",
    "purchase_order_number": "PO-999",
    "line_items": [
        {
            "description": "Widget",
            "quantity": 1,
            "unit_price": 100.0,
            "amount": 100.0,
            "currency": "USD",
        }
    ],
    "metadata": {},
}

FAKE_INVOICE_ID = str(uuid.uuid4())


def _make_supabase_mock():
    """Return a mock Supabase client that simulates table insert/select chains."""
    mock_supabase = MagicMock()

    # invoices table insert
    invoice_row = {**FIXTURE_INVOICE_DICT, "id": FAKE_INVOICE_ID, "raw_text": "# Invoice", "llm_provider": "anthropic"}
    invoice_row.pop("line_items", None)
    mock_invoice_insert = MagicMock()
    mock_invoice_insert.execute.return_value = MagicMock(data=[invoice_row])

    # line_items table insert
    line_item_row = {
        **FIXTURE_INVOICE_DICT["line_items"][0],
        "id": str(uuid.uuid4()),
        "invoice_id": FAKE_INVOICE_ID,
    }
    mock_li_insert = MagicMock()
    mock_li_insert.execute.return_value = MagicMock(data=[line_item_row])

    def table_side_effect(name):
        t = MagicMock()
        if name == "invoices":
            t.insert.return_value = mock_invoice_insert
        else:
            t.insert.return_value = mock_li_insert
        return t

    mock_supabase.table.side_effect = table_side_effect
    return mock_supabase


# ---------------------------------------------------------------------------
# Tracer bullet: happy-path upload returns 200 with expected fields
# ---------------------------------------------------------------------------

def test_upload_returns_200_with_invoice_fields():
    """POST /invoices/upload with mocked Docling + LLM returns structured invoice."""
    fake_file = io.BytesIO(b"%PDF-1.4 fake pdf content")
    fake_file.name = "invoice.pdf"

    mock_convert_result = MagicMock()
    mock_convert_result.document.export_to_markdown.return_value = "# Invoice\nINV-001"

    with patch("routers.invoices.DocumentConverter") as mock_dc, \
         patch("routers.invoices.LLMService") as mock_llm_cls, \
         patch("routers.invoices.EmbeddingService") as mock_emb_cls, \
         patch("routers.invoices.supabase", _make_supabase_mock()):

        mock_dc.return_value.convert.return_value = mock_convert_result
        mock_llm_cls.return_value.extract_invoice.return_value = FIXTURE_INVOICE_DICT
        mock_emb_cls.return_value.chunk_text.return_value = ["chunk1"]
        mock_emb_cls.return_value.embed_chunks.return_value = [[0.1] * 1536]

        from main import app
        client = TestClient(app)
        response = client.post(
            "/invoices/upload",
            files={"file": ("invoice.pdf", fake_file, "application/pdf")},
            data={"llm_provider": "anthropic"},
        )

    assert response.status_code == 200
    body = response.json()
    assert "invoice_number" in body
    assert "total_amount" in body
    assert isinstance(body["line_items"], list)
    assert len(body["line_items"]) > 0


# ---------------------------------------------------------------------------
# Validation: oversized file is rejected with 400
# ---------------------------------------------------------------------------

def test_upload_rejects_oversized_file():
    """Files larger than 10 MB are rejected with HTTP 400."""
    # 10 MB + 1 byte
    big_file = io.BytesIO(b"x" * (10 * 1024 * 1024 + 1))

    from main import app
    client = TestClient(app)
    response = client.post(
        "/invoices/upload",
        files={"file": ("big.pdf", big_file, "application/pdf")},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Validation: unsupported MIME type is rejected with 400
# ---------------------------------------------------------------------------

def test_upload_rejects_unsupported_mime_type():
    """Files with unsupported MIME types are rejected with HTTP 400."""
    txt_file = io.BytesIO(b"plain text invoice")

    from main import app
    client = TestClient(app)
    response = client.post(
        "/invoices/upload",
        files={"file": ("invoice.txt", txt_file, "text/plain")},
    )
    assert response.status_code == 400
