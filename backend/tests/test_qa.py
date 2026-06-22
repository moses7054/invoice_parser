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


def test_semantic_question_returns_vector_mode_with_sources():
    """
    POST /qa with a semantic question returns mode='vector', non-empty answer,
    and a non-empty sources list drawn from embedding search results.
    """
    # Two embedding rows in the DB that are highly similar to the query vector
    query_vector = [0.1] * 1536
    similar_vector = [0.1] * 1536  # cosine similarity = 1.0

    embedding_rows = [
        {
            "invoice_id": "inv-001",
            "chunk_text": "Construction services for concrete foundation work",
            "embedding": similar_vector,
        },
        {
            "invoice_id": "inv-002",
            "chunk_text": "Labour costs for construction of steel framing",
            "embedding": similar_vector,
        },
    ]

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = (
        embedding_rows
    )

    with patch("db.client.supabase", mock_supabase), \
         patch("services.embedding_service.EmbeddingService.embed_query",
               return_value=query_vector), \
         patch("services.llm_service.LLMService.answer_question",
               return_value="These invoices are about construction."):
        client = _make_client()
        response = client.post("/qa", json={
            "question": "Find invoices related to construction services",
            "llm_provider": "anthropic",
        })

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "vector"
    assert body["answer"] == "These invoices are about construction."
    assert isinstance(body["sources"], list)
    assert len(body["sources"]) > 0
    assert "inv-001" in body["sources"] or "inv-002" in body["sources"]
