# PRD: AI-Powered Invoice Parser POC

## Problem Statement

Hiring managers for AI/Document Management roles on SAP ERP need to see working evidence that a candidate understands the full pipeline: ingesting unstructured documents, extracting structured data with AI, storing it relationally, and enabling natural language Q&A over it. A verbal claim of these skills is insufficient — a live, deployable demo is required. Without one, the candidate cannot differentiate themselves from others who only describe the SAP BTP / Azure OpenAI / HANA stack on paper.

Additionally, interviewers who want to run the demo themselves may not have invoice documents on hand, so the app must be self-contained with example documents that showcase its robustness across different invoice layouts.

---

## Solution

A deployable web application that accepts invoice files (PDF or images), parses them using an ML-based document parser, extracts structured fields via a switchable LLM (Claude or GPT-4o), stores both the structured data and vector embeddings in a cloud database, and lets the user ask natural language questions answered by a hybrid SQL + semantic search engine. The app ships with example invoices of varying layouts so the demo is self-contained.

---

## User Stories

1. As a demo user, I want to upload a PDF invoice, so that the system can extract its contents automatically.
2. As a demo user, I want to upload a JPG or PNG image of an invoice, so that scanned or photographed invoices are also supported.
3. As a demo user, I want to choose between example invoices if I don't have my own, so that I can run the demo without any preparation.
4. As a demo user, I want to see a progress indicator while my invoice is being processed, so that I know the system is working.
5. As a demo user, I want to see the extracted invoice fields (vendor, total, date, line items, etc.) displayed in a structured view after upload, so that I can verify the extraction was correct.
6. As a demo user, I want to see all previously uploaded invoices in a list, so that I can review what has been processed.
7. As a demo user, I want to click on any invoice in the list to see its full extracted details, so that I can inspect individual records.
8. As a demo user, I want to ask a free-text question like "What is the total across all invoices?", so that I can query aggregated structured data.
9. As a demo user, I want to ask a semantic question like "Find invoices related to construction services", so that I can find invoices by meaning rather than exact match.
10. As a demo user, I want the system to automatically route my question to either SQL or semantic search based on intent, so that I get the most accurate answer without specifying the query type.
11. As a demo user, I want to see which invoices were used to answer my question, so that I can trace the answer back to its sources.
12. As a demo user, I want to switch the LLM between Claude and GPT-4o from a dropdown in the UI, so that I can demonstrate provider-agnosticism live.
13. As a demo user, I want the selected LLM to apply to both invoice extraction and Q&A, so that the provider switch is consistent across the full pipeline.
14. As a demo user, I want the app to work without logging in, so that I can share the URL directly with an interviewer without setup.
15. As a demo user, I want to upload invoices in multiple currencies, so that the system demonstrates international invoice support.
16. As a demo user, I want line items from each invoice stored relationally, so that I can ask questions like "what items appear most frequently across all invoices".
17. As a demo user, I want any fields the LLM found that weren't in the standard schema to still be captured, so that no data is lost from unusual invoice formats.
18. As an interviewer, I want to see the raw extracted text alongside the structured fields, so that I can evaluate the parsing quality.
19. As an interviewer, I want to see which LLM provider was used for each invoice record, so that I can compare extraction quality between providers.

---

## Implementation Decisions

### Stack
- **Backend**: Python, FastAPI — maps to SAP BTP CAP Python runtime in production
- **Frontend**: Vite + React + TypeScript
- **Document parsing**: Docling (IBM Research, open-source) — handles both text-layer PDFs and scanned image PDFs with a single API; chosen for its table extraction quality on invoice line items
- **LLM providers**: Anthropic Claude (`claude-sonnet-4-6`) and OpenAI GPT-4o; selected at request time via a `llm_provider` parameter — maps to Azure OpenAI endpoint swap in production
- **Database**: Supabase (PostgreSQL + pgvector extension) — maps to HANA Cloud + HANA Vector Engine in production
- **Deployment**: Vercel (frontend), Render (backend)

### Invoice Schema (flexible)
Strict columns extracted into typed DB fields: `invoice_number`, `vendor_name`, `vendor_address`, `bill_to`, `invoice_date`, `due_date`, `subtotal`, `tax_amount`, `tax_rate`, `total_amount`, `currency`, `payment_terms`, `purchase_order_number`. Line items go into a separate relational table. A `metadata` JSONB column captures anything the LLM found outside the strict schema.

### LLM Abstraction
A single `LLMService` class accepts a `provider` enum (`openai` | `anthropic`) and exposes two methods: `extract_invoice(raw_text) -> InvoiceExtracted` and `answer_question(question, context) -> str`. Provider is injected per-request from the frontend dropdown value, never hardcoded.

### Hybrid Q&A Routing
An `intent_router` function (pure, testable) classifies each incoming question as `structured` or `semantic` based on the presence of aggregation keywords (sum, total, count, max, min, compare, highest, lowest) and date/amount patterns. Structured questions are translated to parameterised SQL by the LLM. Semantic questions embed the question and query pgvector for nearest-neighbour invoice chunks. The router runs before any LLM call so it can be unit-tested independently.

### File Handling
Accepted formats: PDF, JPG, PNG. Maximum file size: 10MB. Files are not persisted to disk after processing — raw text and embeddings are stored in Supabase, the file bytes are discarded.

### Embeddings
Invoice raw text (full Docling markdown output) is chunked and embedded using the same provider's embedding model (`text-embedding-3-small` for OpenAI, `voyage-3` for Anthropic). Embeddings stored in a `invoice_embeddings` pgvector table with a reference back to the invoice record.

### Example Invoices
A `sample_invoices/` directory ships with the repo. The user populates this with invoices of varied layouts. The frontend lists these files so they can be one-click uploaded without leaving the app.

---

## Testing Decisions

**What makes a good test here**: test external behaviour through the HTTP boundary — upload a file, assert the structured response shape. Do not test internal service method calls or mock the LLM mid-pipeline; instead use fixture text passed directly to the extraction service in unit tests.

### Integration tests (FastAPI HTTP — highest seam)
- `POST /invoices/upload` with a fixture PDF → assert response contains `invoice_number`, `total_amount`, non-empty `line_items`
- `POST /qa` with a structured question → assert `mode == "sql"` and `answer` contains a number
- `POST /qa` with a semantic question → assert `mode == "vector"` and `sources` is non-empty
- `GET /invoices` → assert list length increases after upload

### Unit tests (Q&A router — pure function)
- `intent_router("What is the total amount across all invoices?")` → `"structured"`
- `intent_router("Find invoices related to logistics services")` → `"semantic"`
- `intent_router("How many invoices are from Germany?")` → `"structured"`
- `intent_router("Show me invoices mentioning late payment penalties")` → `"semantic"`

These require no network calls and run instantly — they cover the hardest branching logic in the system.

---

## Out of Scope

- SAP BTP, HANA, or UI5/Fiori — this POC uses equivalent open-source/cloud tools; the README maps each to its SAP counterpart
- Authentication or multi-tenancy — single shared instance, no user accounts
- Invoice approval workflow or status tracking
- Export to ERP (posting to SAP MM/FI modules)
- Batch upload of multiple files simultaneously
- Document classification beyond invoices (receipts, purchase orders, etc.)
- Real-time streaming of LLM responses
- Audit logging

---

## Further Notes

The README should include an explicit "SAP Production Mapping" table:

| This POC | SAP Production Equivalent |
|---|---|
| Docling | SAP Document Information Extraction (BTP) |
| FastAPI | SAP BTP CAP (Python runtime) |
| Supabase PostgreSQL | SAP HANA Cloud |
| pgvector | SAP HANA Vector Engine |
| OpenAI GPT-4o | Azure OpenAI via BTP Destination Service |
| Vercel | SAP Launchpad Service |
| Vite React | SAP UI5 / Fiori Elements |

This table should be shown during any interview demo — it reframes the POC as a blueprint, not a toy.
