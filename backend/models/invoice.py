"""
Pydantic models matching the invoice_parser database schema.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None


class Invoice(BaseModel):
    id: Optional[uuid.UUID] = None
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    bill_to: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    purchase_order_number: Optional[str] = None
    raw_text: Optional[str] = None
    llm_provider: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    line_items: List[LineItem] = Field(default_factory=list)


class InvoiceEmbedding(BaseModel):
    id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    chunk_text: Optional[str] = None
    # vector(1536) stored as a list of floats
    embedding: Optional[List[float]] = None


class InvoiceExtracted(BaseModel):
    """Intermediate model representing LLM-extracted invoice data before DB insertion."""
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    bill_to: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    purchase_order_number: Optional[str] = None
    llm_provider: Optional[str] = None
    line_items: List[LineItem] = Field(default_factory=list)
