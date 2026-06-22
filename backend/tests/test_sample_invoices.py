"""
Tests for Issue #7: Sample invoices + one-click demo.

Covers:
  GET  /sample-invoices              — lists available sample invoice files
  POST /invoices/upload-sample       — runs full pipeline from a sample file
  POST /invoices/upload-sample       — path traversal returns 400
"""
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Shared fixture data (mirrors what LLM extraction would return)
# ---------------------------------------------------------------------------

FIXTURE_INVOICE_DICT = {
    "invoice_number": "INV-2024-001",
    "vendor_name": "TechCorp Solutions Ltd",
    "vendor_address": "123 Innovation Drive, San Francisco, CA 94105",
    "bill_to": "Acme Corporation",
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-15",
    "subtotal": 1995.0,
    "tax_amount": 169.58,
    "tax_rate": 0.085,
    "total_amount": 2164.58,
    "currency": "USD",
    "payment_terms": "Net 30",
    "purchase_order_number": None,
    "line_items": [
        {
            "description": "Software License - Enterprise Tier",
            "quantity": 5,
            "unit_price": 299.0,
            "amount": 1495.0,
            "currency": "USD",
        },
        {
            "description": "Technical Support (Annual)",
            "quantity": 1,
            "unit_price": 500.0,
            "amount": 500.0,
            "currency": "USD",
        },
    ],
    "metadata": {},
}

FAKE_INVOICE_ID = str(uuid.uuid4())


def _make_supabase_mock():
    """Return a mock Supabase client that simulates table insert chains."""
    mock_supabase = MagicMock()

    invoice_row = {
        **FIXTURE_INVOICE_DICT,
        "id": FAKE_INVOICE_ID,
        "raw_text": "# Invoice",
        "llm_provider": "anthropic",
    }
    invoice_row.pop("line_items", None)
    mock_invoice_insert = MagicMock()
    mock_invoice_insert.execute.return_value = MagicMock(data=[invoice_row])

    line_item_rows = []
    for item in FIXTURE_INVOICE_DICT["line_items"]:
        line_item_rows.append({**item, "id": str(uuid.uuid4()), "invoice_id": FAKE_INVOICE_ID})
    mock_li_insert = MagicMock()
    mock_li_insert.execute.return_value = MagicMock(data=[line_item_rows[0]])

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
# Tracer bullet: GET /sample-invoices returns a non-empty list
# ---------------------------------------------------------------------------

def test_list_sample_invoices_returns_list():
    """GET /sample-invoices returns a JSON list of sample invoice file descriptors."""
    from main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/sample-invoices")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    # The actual sample files exist in the repo
    assert len(body) >= 3


def test_list_sample_invoices_items_have_expected_shape():
    """Each item in GET /sample-invoices has 'filename' and 'display_name' keys."""
    from main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/sample-invoices")

    assert response.status_code == 200
    for item in response.json():
        assert "filename" in item
        assert "display_name" in item


# ---------------------------------------------------------------------------
# POST /invoices/upload-sample — happy path
# ---------------------------------------------------------------------------

def test_upload_sample_valid_file_returns_200():
    """POST /invoices/upload-sample with a known sample filename runs the full pipeline."""
    from main import app
    from fastapi.testclient import TestClient

    mock_convert_result = MagicMock()
    mock_convert_result.document.export_to_markdown.return_value = "# Invoice\nINV-2024-001"

    with patch("routers.invoices.DocumentConverter") as mock_dc, \
         patch("routers.invoices.LLMService") as mock_llm_cls, \
         patch("routers.invoices.EmbeddingService") as mock_emb_cls, \
         patch("routers.invoices.supabase", _make_supabase_mock()):

        mock_dc.return_value.convert.return_value = mock_convert_result
        mock_llm_cls.return_value.extract_invoice.return_value = FIXTURE_INVOICE_DICT.copy()
        mock_emb_cls.return_value.chunk_text.return_value = ["chunk1"]
        mock_emb_cls.return_value.embed_chunks.return_value = [[0.1] * 1536]

        client = TestClient(app)
        response = client.post(
            "/invoices/upload-sample",
            json={"sample_filename": "invoice_usd_tech.pdf", "llm_provider": "anthropic"},
        )

    assert response.status_code == 200
    body = response.json()
    assert "id" in body
    assert "vendor_name" in body
    assert isinstance(body.get("line_items"), list)


def test_upload_sample_response_has_invoice_fields():
    """POST /invoices/upload-sample response includes key invoice fields."""
    from main import app
    from fastapi.testclient import TestClient

    mock_convert_result = MagicMock()
    mock_convert_result.document.export_to_markdown.return_value = "# Invoice"

    with patch("routers.invoices.DocumentConverter") as mock_dc, \
         patch("routers.invoices.LLMService") as mock_llm_cls, \
         patch("routers.invoices.EmbeddingService") as mock_emb_cls, \
         patch("routers.invoices.supabase", _make_supabase_mock()):

        mock_dc.return_value.convert.return_value = mock_convert_result
        mock_llm_cls.return_value.extract_invoice.return_value = FIXTURE_INVOICE_DICT.copy()
        mock_emb_cls.return_value.chunk_text.return_value = ["chunk1"]
        mock_emb_cls.return_value.embed_chunks.return_value = [[0.1] * 1536]

        client = TestClient(app)
        response = client.post(
            "/invoices/upload-sample",
            json={"sample_filename": "invoice_usd_tech.pdf"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body.get("invoice_number") == "INV-2024-001"
    assert body.get("total_amount") == 2164.58


# ---------------------------------------------------------------------------
# POST /invoices/upload-sample — path traversal protection
# ---------------------------------------------------------------------------

def test_upload_sample_path_traversal_returns_400():
    """POST /invoices/upload-sample with '../etc/passwd' returns 400."""
    from main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.post(
        "/invoices/upload-sample",
        json={"sample_filename": "../etc/passwd"},
    )

    assert response.status_code == 400


def test_upload_sample_unknown_file_returns_404():
    """POST /invoices/upload-sample with a non-existent filename returns 404."""
    from main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.post(
        "/invoices/upload-sample",
        json={"sample_filename": "nonexistent_invoice.pdf"},
    )

    assert response.status_code == 404
