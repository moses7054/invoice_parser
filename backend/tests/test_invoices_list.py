"""
Integration tests: GET /invoices and GET /invoices/{id}
No real Supabase credentials are used — responses are mocked.
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

FAKE_INVOICE_ID = str(uuid.uuid4())

INVOICE_ROW = {
    "id": FAKE_INVOICE_ID,
    "vendor_name": "Test Vendor",
    "invoice_date": "2024-01-15",
    "total_amount": 100.0,
    "currency": "USD",
    "llm_provider": "anthropic",
    "created_at": "2024-01-15T10:00:00",
}

FULL_INVOICE_ROW = {
    **INVOICE_ROW,
    "invoice_number": "INV-001",
    "vendor_address": "123 Main St",
    "bill_to": "Acme Corp",
    "due_date": "2024-02-15",
    "subtotal": 90.0,
    "tax_amount": 10.0,
    "tax_rate": 0.1,
    "payment_terms": "Net 30",
    "purchase_order_number": "PO-999",
    "raw_text": "# Invoice",
    "metadata": {},
}

LINE_ITEM_ROW = {
    "id": str(uuid.uuid4()),
    "invoice_id": FAKE_INVOICE_ID,
    "description": "Widget",
    "quantity": 1,
    "unit_price": 100.0,
    "amount": 100.0,
    "currency": "USD",
}


def _chainable(data):
    """Return a MagicMock where any attribute access or call returns itself, until .execute()."""
    m = MagicMock()
    m.execute.return_value = MagicMock(data=data)
    # chained calls like .order(), .eq() should return same mock so .execute() still works
    m.order.return_value = m
    m.eq.return_value = m
    m.select.return_value = m
    return m


def _make_list_mock():
    """Mock Supabase for GET /invoices — returns one invoice row."""
    mock_supabase = MagicMock()

    def table_side_effect(name):
        t = MagicMock()
        if name == "invoices":
            chain = _chainable([INVOICE_ROW])
            t.select.return_value = chain
        return t

    mock_supabase.table.side_effect = table_side_effect
    return mock_supabase


def _make_detail_mock(invoice_data=None, line_items=None):
    """Mock Supabase for GET /invoices/{id}."""
    if invoice_data is None:
        invoice_data = [FULL_INVOICE_ROW]
    if line_items is None:
        line_items = [LINE_ITEM_ROW]

    mock_supabase = MagicMock()

    def table_side_effect(name):
        t = MagicMock()
        if name == "invoices":
            chain = _chainable(invoice_data)
            t.select.return_value = chain
        elif name == "line_items":
            chain = _chainable(line_items)
            t.select.return_value = chain
        return t

    mock_supabase.table.side_effect = table_side_effect
    return mock_supabase


# ---------------------------------------------------------------------------
# Tracer bullet: GET /invoices returns 200 with a list
# ---------------------------------------------------------------------------

def test_list_invoices_returns_200_with_list():
    """GET /invoices returns 200 and a list containing at least one invoice."""
    with patch("routers.invoices.supabase", _make_list_mock()):
        from main import app
        client = TestClient(app)
        response = client.get("/invoices")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["vendor_name"] == "Test Vendor"
    assert body[0]["total_amount"] == 100.0
    assert body[0]["currency"] == "USD"
    assert body[0]["llm_provider"] == "anthropic"


# ---------------------------------------------------------------------------
# GET /invoices/{id} returns 200 with full record + line items
# ---------------------------------------------------------------------------

def test_get_invoice_detail_returns_200_with_line_items():
    """GET /invoices/{id} returns 200 with full invoice record including line_items."""
    with patch("routers.invoices.supabase", _make_detail_mock()):
        from main import app
        client = TestClient(app)
        response = client.get(f"/invoices/{FAKE_INVOICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == FAKE_INVOICE_ID
    assert body["vendor_name"] == "Test Vendor"
    assert body["invoice_number"] == "INV-001"
    assert body["raw_text"] == "# Invoice"
    assert isinstance(body["line_items"], list)
    assert len(body["line_items"]) == 1
    assert body["line_items"][0]["description"] == "Widget"


# ---------------------------------------------------------------------------
# GET /invoices/{id} returns 404 when invoice not found
# ---------------------------------------------------------------------------

def test_get_invoice_detail_returns_404_when_not_found():
    """GET /invoices/{id} returns 404 when invoice does not exist."""
    mock = _make_detail_mock(invoice_data=[], line_items=[])
    with patch("routers.invoices.supabase", mock):
        from main import app
        client = TestClient(app)
        response = client.get(f"/invoices/{uuid.uuid4()}")

    assert response.status_code == 404
