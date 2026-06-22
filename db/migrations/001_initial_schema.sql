-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT,
  vendor_name TEXT,
  vendor_address TEXT,
  bill_to TEXT,
  invoice_date DATE,
  due_date DATE,
  subtotal NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  tax_rate NUMERIC(5,4),
  total_amount NUMERIC(12,2),
  currency TEXT,
  payment_terms TEXT,
  purchase_order_number TEXT,
  raw_text TEXT,
  llm_provider TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- line_items table
CREATE TABLE IF NOT EXISTS line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(10,3),
  unit_price NUMERIC(12,2),
  amount NUMERIC(12,2),
  currency TEXT
);

-- invoice_embeddings table
CREATE TABLE IF NOT EXISTS invoice_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  chunk_text TEXT,
  embedding vector(1536)
);
