# AI-Powered Invoice Parser

A deployable web app that ingests PDF and image invoices, extracts structured data via Claude or GPT-4o, stores everything in a vector-capable database, and lets you ask natural-language questions over your invoice data.

Built as a production blueprint for the SAP BTP / Azure OpenAI / HANA Cloud stack.

## Features

- Upload PDF or image invoices (drag-and-drop or one-click sample)
- Extracts vendor, dates, amounts, line items, and currency automatically
- Switch between Claude (claude-sonnet-4-6) and GPT-4o live — no reload required
- Ask natural-language questions: structured questions run SQL, semantic questions use vector search
- All previously uploaded invoices browsable in a list and detail view

## Stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Frontend | Vite + React + TypeScript |
| Document parsing | pdfplumber (PDF) + pytesseract (images) |
| LLM providers | Anthropic Claude, OpenAI GPT-4o |
| Database | Supabase (PostgreSQL + pgvector) |
| Deployment | Vercel (frontend) + Railway (backend) |

## Run Locally

### Prerequisites
- Python 3.9+
- Node.js 18+
- A Supabase project with pgvector enabled
- Anthropic API key and/or OpenAI API key

### Setup

1. Clone the repo and copy env vars:
   ```bash
   cp .env.example .env
   # Fill in SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
   ```

2. Apply the database migration in your Supabase SQL editor:
   ```sql
   -- Run the contents of db/migrations/001_initial_schema.sql
   ```

3. Start the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. Start the frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Set VITE_API_URL=http://localhost:8000
   npm run dev
   ```

5. Open http://localhost:5173

## Run the Demo

1. On the upload page, click any sample invoice under "Or try a sample invoice" for a one-click demo
2. After processing, you'll see the extracted fields — vendor, amounts, line items, currency
3. Switch the LLM provider (top right dropdown) and upload another sample to compare extraction quality
4. Go to Q&A and try:
   - **Structured**: "What is the total amount across all invoices?"
   - **Structured**: "How many invoices are in EUR?"
   - **Semantic**: "Find invoices related to construction services"
   - **Semantic**: "Show me invoices mentioning VAT"

## Deploy

### Backend (Railway)
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repo, set **Root Directory** to `backend/`
3. Railway auto-detects Python and uses `nixpacks.toml` to install `tesseract` for image OCR
4. Add env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
5. Under Settings → Networking → Generate Domain to get your public URL

### Frontend (Vercel)
1. Import this repo in Vercel, set root directory to `frontend/`
2. Add env var: `VITE_API_URL=<your Railway backend URL>`
3. Deploy — Vercel auto-detects Vite

## SAP Production Mapping

This POC is a functional blueprint for the SAP BTP + HANA Cloud stack:

| This POC | SAP Production Equivalent |
|---|---|
| Docling | SAP Document Information Extraction (BTP) |
| FastAPI | SAP BTP CAP (Python runtime) |
| Supabase PostgreSQL | SAP HANA Cloud |
| pgvector | SAP HANA Vector Engine |
| OpenAI GPT-4o | Azure OpenAI via BTP Destination Service |
| Vercel | SAP Launchpad Service |
| Vite React | SAP UI5 / Fiori Elements |

The architecture is identical — swap each component in the table and the system runs on SAP infrastructure with no structural changes.
