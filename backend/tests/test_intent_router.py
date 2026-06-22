"""
Unit tests for intent_router — pure function, no network calls.
"""
from services.intent_router import intent_router


def test_total_amount_is_structured():
    assert intent_router("What is the total amount across all invoices?") == "structured"


def test_count_from_germany_is_structured():
    assert intent_router("How many invoices are from Germany?") == "structured"


def test_logistics_is_semantic():
    assert intent_router("Find invoices related to logistics services") == "semantic"


def test_late_payment_is_semantic():
    assert intent_router("Show me invoices mentioning late payment penalties") == "semantic"
