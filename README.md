# AI-Powered Invoice Parser

A deployable web app that ingests PDF and image invoices, extracts structured data with a switchable LLM (Claude or GPT-4o), stores it relationally alongside vector embeddings, and answers natural-language questions over the data using a hybrid SQL + semantic search engine.

Built as a working **blueprint for the SAP BTP / Azure OpenAI / HANA Cloud stack** — every component maps 1:1 to its SAP production equivalent (see [SAP Production Mapping](#sap-production-mapping)).

**Live demo:** frontend on Vercel → backend on Railway → Supabase (Postgres + pgvector).

---

## Features

- **Upload** any PDF or image invoice (drag-and-drop, file picker, or one-click sample)
- **AI extraction** of vendor, dates, amounts, line items, currency, tax, and payment terms
- **Multilingual** — parses non-English invoices (a German sample ships in the repo)
- **Provider switch** between Claude (`claude-sonnet-4-6`) and GPT-4o live, with no reload — applied to both extraction *and* Q&A
- **Hybrid Q&A** — questions are auto-routed to SQL (aggregations, counts) or semantic vector search (meaning-based), with source invoices cited
- **Flexible schema** — strict fields go into typed columns; anything extra the LLM finds is preserved in a `metadata` JSONB column
- **No login** — single shared instance, shareable by URL

---

## Architecture

### High-level flow

```
┌──────────────┐        ┌─────────────────────────────────────┐        ┌──────────────┐
│   Frontend   │  HTTPS │              Backend                 │        │   Supabase   │
│ Vite + React │ ─────► │             FastAPI                  │ ─────► │  PostgreSQL  │
│  (Vercel)    │  JSON  │            (Railway)                 │  REST  │  + pgvector  │
└──────────────┘        └─────────────────────────────────────┘        └──────────────┘
                                    │         │
                              ┌─────┘         └──────┐
                              ▼                      ▼
                        ┌───────────┐         ┌─────────────┐
                        │  Parsing  │         │  LLM / Embed │
                        │ pdfplumber│         │   Claude /   │
                        │ +tesseract│         │   GPT-4o /   │
                        └───────────┘         │   Voyage     │
                                              └─────────────┘
```

### Upload pipeline (`POST /invoices/upload`)

```
file bytes
   │
   ▼
[1] _extract_text()          PDF → pdfplumber · image → tesseract OCR
   │                         (falls back to plain-text read if parsing fails)
   ▼
[2] LLMService.extract_invoice()   raw text → structured JSON (Claude or GPT-4o)
   │                               overflow fields captured into `metadata`
   ▼
[3] _sanitize()              strip NUL/control chars, drop NaN/Inf
   │
   ▼
[4] Supabase insert          invoices row + line_items rows
   │
   ▼
[5] EmbeddingService         chunk raw text → embeddings → invoice_embeddings
   │                         (non-fatal: upload succeeds even without an embed key)
   ▼
full invoice JSON  ──►  frontend navigates to /invoices/:id
```

### Hybrid Q&A (`POST /qa`)

```
question
   │
   ▼
intent_router()  ── pure function, no LLM call ──┐
   │                                              │
   ├── "structured" ──► fetch all invoices ──► LLM answers from JSON ──► mode: "sql"
   │
   └── "semantic" ───► embed query ──► cosine rank invoice_embeddings
                          ──► top-k chunks ──► LLM synthesises answer ──► mode: "vector"
                          (falls back to structured if no embeddings available)
```

The router keys on aggregation keywords (`sum`, `total`, `count`, `how many`, `highest`, …) and amount/date patterns. It runs **before** any LLM call so it is fully unit-testable in isolation.

---

## Project structure

```
.
├── Dockerfile                  # Backend image: python:3.11-slim + tesseract-ocr
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router registration, /health
│   ├── db/client.py            # Supabase client (forces HTTP/1.1, strips key whitespace)
│   ├── models/invoice.py       # Pydantic models: Invoice, LineItem, InvoiceExtracted…
│   ├── routers/
│   │   ├── invoices.py         # upload, upload-sample, list, detail, extraction pipeline
│   │   └── qa.py               # hybrid Q&A: structured + semantic paths
│   ├── services/
│   │   ├── llm_service.py      # provider-agnostic extract_invoice / answer_question
│   │   ├── embedding_service.py# chunk + embed (Voyage for Anthropic, OpenAI for GPT)
│   │   └── intent_router.py    # pure question classifier (structured | semantic)
│   └── tests/                  # 30 tests — HTTP-boundary integration + router unit tests
├── frontend/
│   └── src/
│       ├── api/config.ts       # resolves & normalises VITE_API_URL
│       ├── context/ProviderContext.tsx  # global Claude↔GPT-4o selection
│       └── pages/              # Upload, InvoiceList, InvoiceDetail, QA
├── db/migrations/              # 001_initial_schema.sql (tables + pgvector)
├── sample_invoices/            # 4 real PDF invoices (USD, EUR-German, GBP, INR)
└── scripts/generate_samples.py # regenerates the sample PDFs (reportlab)
```

### Key design decisions

- **Provider-agnostic LLM layer.** `LLMService` takes a `provider` arg per request; the frontend sends the dropdown value. Nothing is hardcoded — mirrors swapping an Azure OpenAI deployment in production.
- **Intent routing is a pure function.** No network, no LLM — the hardest branching logic is the easiest to test.
- **Flexible schema.** Strict columns for known fields; a `metadata` JSONB catch-all so unusual invoice layouts never lose data.
- **Embeddings are non-fatal.** The core demo (upload → extract → store → SQL Q&A) runs with just an Anthropic key + Supabase. Semantic search is a bonus that activates when an embedding key is present.
- **Resilient extraction.** Real PDFs use pdfplumber, images use tesseract, and anything else falls back to a plain-text read — so the pipeline never hard-fails on an odd input.

---

## Data model

```
invoices                         line_items                    invoice_embeddings
─────────                        ──────────                    ──────────────────
id (uuid, pk)                    id (uuid, pk)                 id (uuid, pk)
invoice_number                   invoice_id ─► invoices.id     invoice_id ─► invoices.id
vendor_name, vendor_address      description                   chunk_text
bill_to                          quantity                      embedding  vector(1536)
invoice_date, due_date           unit_price
subtotal, tax_amount, tax_rate   amount
total_amount, currency           currency
payment_terms, po_number
raw_text                         (pgvector extension enabled for cosine similarity)
llm_provider
metadata (jsonb)
created_at
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript, Tailwind CSS, React Router |
| Backend | Python + FastAPI (Uvicorn) |
| PDF parsing | pdfplumber |
| Image OCR | Pillow + pytesseract (tesseract-ocr) |
| LLM providers | Anthropic Claude `claude-sonnet-4-6`, OpenAI GPT-4o |
| Embeddings | Voyage `voyage-3` (Anthropic) / `text-embedding-3-small` (OpenAI) |
| Database | Supabase (PostgreSQL + pgvector) |
| Deploy | Vercel (frontend) · Railway (backend, Docker) |

---

## Run locally

### Prerequisites
- Python 3.11+, Node 18+
- A Supabase project (free tier) with the pgvector extension
- An Anthropic API key (and/or OpenAI key)
- `tesseract-ocr` installed locally if you want image OCR (`brew install tesseract`)

### 1. Database
Run [`db/migrations/001_initial_schema.sql`](db/migrations/001_initial_schema.sql) in the Supabase SQL editor. It enables pgvector and creates the three tables.

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env       # fill in the values below
uvicorn main:app --reload
```

`.env` (repo root):
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service_role key>
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<optional>
VOYAGE_API_KEY=<optional — enables semantic search on the Anthropic path>
```

### 3. Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev    # http://localhost:5173
```

### Tests
```bash
cd backend && python -m pytest -v      # 30 tests, no network calls
```

---

## Run the demo

1. On the upload page, click any **sample invoice** (or drag in your own PDF/image).
2. Watch it extract vendor, line items, totals, and currency, then land on the detail view.
3. Flip the **model dropdown** (top-right) to GPT-4o and upload another — the detail page badge records which model extracted each invoice.
4. Open **Q&A** and try:
   - *Structured:* "What is the total amount across all invoices?" · "How many invoices are in EUR?"
   - *Semantic:* "Find invoices related to construction" · "Show invoices mentioning consulting"

---

## Deploy

### Backend — Railway (Docker)
1. New Project → Deploy from GitHub repo (root directory = repo root).
2. Railway auto-detects the **Dockerfile** (installs tesseract, pins Python 3.11, bundles sample invoices).
3. Set variables: `SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (+ optional `VOYAGE_API_KEY`).
4. Settings → Networking → Generate Domain; set the target port to the value Railway assigns (`$PORT`).

### Frontend — Vercel
1. Import the repo, root directory = `frontend/`.
2. Set `VITE_API_URL` to the Railway backend URL (include `https://`).
3. Deploy — Vercel auto-detects Vite. The included `vercel.json` handles SPA routing.

---

## SAP Production Mapping

This POC is a functional blueprint for the SAP BTP + HANA Cloud stack. Swap each row and the architecture runs unchanged on SAP infrastructure:

| This POC | SAP Production Equivalent |
|---|---|
| pdfplumber / tesseract | SAP Document Information Extraction (BTP) |
| FastAPI | SAP BTP CAP (Python runtime) |
| Supabase PostgreSQL | SAP HANA Cloud |
| pgvector | SAP HANA Vector Engine |
| OpenAI GPT-4o | Azure OpenAI via BTP Destination Service |
| Vercel | SAP Launchpad Service |
| Vite + React | SAP UI5 / Fiori Elements |
