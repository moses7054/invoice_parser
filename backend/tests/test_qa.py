"""
Integration tests for POST /qa endpoint.
"""
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def _make_client():
    from main import app
    return TestClient(app)


def test_structured_question_returns_sql_mode_and_non_empty_answer():
    """POST /qa with a structured question returns mode='sql' and a non-empty answer."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": "inv-001",
            "vendor_name": "Acme Corp",
            "total_amount": 300.00,
            "currency": "USD",
            "invoice_date": "2024-01-15",
            "llm_provider": "anthropic",
        },
        {
            "id": "inv-002",
            "vendor_name": "Globex",
            "total_amount": 200.00,
            "currency": "USD",
            "invoice_date": "2024-02-20",
            "llm_provider": "anthropic",
        },
    ]

    with patch("db.client.supabase", mock_supabase), \
         patch("services.llm_service.LLMService.answer_question",
               return_value="The total is $500.00"):
        client = _make_client()
        response = client.post("/qa", json={
            "question": "What is the total amount across all invoices?",
            "llm_provider": "anthropic",
        })

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "sql"
    assert "500" in body["answer"] or len(body["answer"]) > 0
    assert isinstance(body["sources"], list)


def test_semantic_question_returns_vector_mode():
    """POST /qa with a semantic question returns mode='vector' and placeholder answer."""
    client = _make_client()
    response = client.post("/qa", json={
        "question": "Find invoices related to logistics services",
        "llm_provider": "anthropic",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "vector"
    assert len(body["answer"]) > 0
    assert body["sources"] == []
