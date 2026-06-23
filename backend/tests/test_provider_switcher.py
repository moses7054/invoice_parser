"""
Backend verification tests for Issue #6: LLM provider switcher.

These tests confirm that the backend correctly stores and returns `llm_provider`
for both "anthropic" and "openai", and that POST /qa passes the provider through
to the LLM service.
"""
import io
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

FIXTURE_INVOICE_DICT = {
    "invoice_number": "INV-TEST-001",
    "vendor_name": "Provider Test Vendor",
    "vendor_address": "1 Provider Lane",
    "bill_to": "Test Corp",
    "invoice_date": "2024-03-01",
    "due_date": "2024-04-01",
    "subtotal": 200.0,
    "tax_amount": 20.0,
    "tax_rate": 0.1,
    "total_amount": 220.0,
    "currency": "USD",
    "payment_terms": "Net 30",
    "purchase_order_number": "PO-001",
    "line_items": [
        {
            "description": "Consulting",
            "quantity": 2,
            "unit_price": 100.0,
            "amount": 200.0,
            "currency": "USD",
        }
    ],
    "metadata": {},
}


def _make_supabase_mock(provider: str):
    """Return a Supabase mock that echoes back the given llm_provider."""
    fake_id = str(uuid.uuid4())
    mock_supabase = MagicMock()

    invoice_row = {
        **FIXTURE_INVOICE_DICT,
        "id": fake_id,
        "raw_text": "# Invoice\nTest content",
        "llm_provider": provider,
    }
    invoice_row.pop("line_items", None)

    mock_invoice_insert = MagicMock()
    mock_invoice_insert.execute.return_value = MagicMock(data=[invoice_row])

    line_item_row = {
        **FIXTURE_INVOICE_DICT["line_items"][0],
        "id": str(uuid.uuid4()),
        "invoice_id": fake_id,
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


def _upload_with_provider(provider: str):
    """Helper: POST /invoices/upload with the given llm_provider, return response."""
    fake_file = io.BytesIO(b"%PDF-1.4 fake pdf")
    fake_file.name = "test.pdf"

    with patch("routers.invoices._extract_text", return_value="# Invoice\nTest content"), \
         patch("routers.invoices.LLMService") as mock_llm_cls, \
         patch("routers.invoices.EmbeddingService") as mock_emb_cls, \
         patch("routers.invoices.supabase", _make_supabase_mock(provider)):

        mock_llm_cls.return_value.extract_invoice.return_value = dict(FIXTURE_INVOICE_DICT)
        mock_emb_cls.return_value.chunk_text.return_value = ["chunk"]
        mock_emb_cls.return_value.embed_chunks.return_value = [[0.1] * 1536]

        from main import app
        client = TestClient(app)
        return client.post(
            "/invoices/upload",
            files={"file": ("test.pdf", fake_file, "application/pdf")},
            data={"llm_provider": provider},
        )


# ---------------------------------------------------------------------------
# Test 1 (tracer bullet): upload with openai provider stores llm_provider=openai
# ---------------------------------------------------------------------------

def test_upload_with_openai_provider_returns_llm_provider_openai():
    """POST /invoices/upload with llm_provider=openai returns llm_provider: 'openai'."""
    response = _upload_with_provider("openai")

    assert response.status_code == 200
    body = response.json()
    assert body["llm_provider"] == "openai", (
        f"Expected llm_provider='openai', got '{body.get('llm_provider')}'"
    )


# ---------------------------------------------------------------------------
# Test 2: upload with anthropic provider stores llm_provider=anthropic
# ---------------------------------------------------------------------------

def test_upload_with_anthropic_provider_returns_llm_provider_anthropic():
    """POST /invoices/upload with llm_provider=anthropic returns llm_provider: 'anthropic'."""
    response = _upload_with_provider("anthropic")

    assert response.status_code == 200
    body = response.json()
    assert body["llm_provider"] == "anthropic", (
        f"Expected llm_provider='anthropic', got '{body.get('llm_provider')}'"
    )


# ---------------------------------------------------------------------------
# Test 3: POST /qa passes llm_provider to LLM service and returns 200
# ---------------------------------------------------------------------------

def test_qa_with_openai_provider_passes_through_and_returns_200():
    """POST /qa with llm_provider=openai passes the provider through and returns 200."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": "inv-001",
            "vendor_name": "Acme Corp",
            "total_amount": 500.0,
            "currency": "USD",
            "invoice_date": "2024-01-15",
            "llm_provider": "openai",
        }
    ]

    captured_provider = {}

    def fake_answer_question(question, context, provider="anthropic"):
        captured_provider["value"] = provider
        return "Total is $500."

    with patch("db.client.supabase", mock_supabase), \
         patch("services.llm_service.LLMService.answer_question",
               side_effect=fake_answer_question):
        from main import app
        client = TestClient(app)
        response = client.post("/qa", json={
            "question": "What is the total amount?",
            "llm_provider": "openai",
        })

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "Total is $500."
    assert captured_provider.get("value") == "openai", (
        f"Expected LLMService to receive provider='openai', got '{captured_provider.get('value')}'"
    )
