"""
Integration test: GET /health returns 200 with {"status": "ok"}.
Uses FastAPI TestClient — no real Supabase credentials needed.
"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_ok_body():
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
