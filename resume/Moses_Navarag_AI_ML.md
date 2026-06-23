# V Moses Navarag

Hyderabad, India · moses7054@gmail.com
linkedin.com/in/vaddi-moses · github.com/moses7054

---

Full-stack and AI/ML application developer who builds end-to-end document-processing
systems — OCR, LLM-based extraction, and semantic search over relational + vector data.
Strong in Python, REST API design, and PostgreSQL, with hands-on experience integrating
LLM platforms (Anthropic, OpenAI) and shipping production apps on Docker. I also teach and
mentor developers at Turbin3. Built a deployed AI Document Management POC explicitly
architected as a blueprint for the SAP BTP / HANA Cloud / Azure OpenAI stack.

---

## Featured Projects

### AI-Powered Invoice Parser — Document Management System  ·  parseinvoice.xyz
*Python · FastAPI · React/TypeScript · PostgreSQL + pgvector · Claude / GPT-4o · Docker*

An end-to-end AI DMS that ingests invoices, extracts structured data with LLMs, stores it
relationally with vector embeddings, and answers natural-language questions over it.
Architected as a 1:1 blueprint for the SAP BTP + HANA Cloud stack.

- Built a document pipeline that ingests **PDFs and images**, runs **OCR** (Tesseract) and
  text extraction, then uses an LLM to extract 13+ structured fields plus line items into a
  typed schema, with a JSONB catch-all for non-standard fields.
- Implemented **hybrid Q&A**: a pure intent router sends aggregate questions to SQL and
  meaning-based questions to **semantic vector search** over pgvector embeddings, citing the
  source documents for each answer.
- Designed a **provider-agnostic LLM layer** with live switching between Claude
  (`claude-sonnet-4-6`) and GPT-4o for both extraction and Q&A — directly analogous to
  swapping an **Azure OpenAI** deployment via the SAP BTP Destination Service.
- Built and consumed **REST APIs** (FastAPI) for upload, retrieval, and Q&A; designed the
  relational + vector **data model** (invoices, line_items, embeddings) on PostgreSQL +
  pgvector — the open-source equivalent of **HANA Cloud + HANA Vector Engine**.
- Developed the **document upload, search, and detail UI** in React/TypeScript (analogous
  to UI5/Fiori) and deployed the system with **Docker** (backend on Railway, frontend on
  Vercel) under a custom domain.
- Validated multilingual extraction (English + German invoices) and wrote an HTTP-boundary
  integration + unit test suite (30 tests).

### Compliance Document Scanner — AI Due-Diligence Tool
*Google Vertex AI · Python · Document analysis*

An AI tool that reviews documents from companies seeking investment and assesses regulatory
compliance, built for investment due-diligence.

- Used **Google Vertex AI** to analyse company documents and classify them against **US and
  EU regulatory frameworks**.
- Determined which laws each company is **required to comply** with, and flagged where they
  are **currently non-compliant** — turning unstructured legal/operational docs into a
  structured compliance report.
- Demonstrates AI/ML document classification and semantic understanding on a second major
  cloud AI platform (Vertex AI), complementing the Anthropic/OpenAI work above.

---

## Work Experience

**Teacher — Turbin3 (Builders Cohort)**  ·  Remote  ·  Apr 2025 – Present
- Mentor developers building backend systems and on-chain programs; lead office hours,
  breakout rooms, and code reviews.
- Help students ideate and ship capstone projects end-to-end.

**Full-Stack Developer — Syntax Studios (Contract)**  ·  Remote  ·  Oct 2025 – Nov 2025
- Designed, built, and tested backend programs from client requirements, producing clear
  **architectural diagrams and technical specifications**.
- Wrote **TypeScript** integration scripts to exercise and validate services end-to-end.

**Backend Lead — Menagerie (Turbin3 Elite)**  ·  Remote  ·  Apr 2025 – Jun 2025
- Led the design of a scalable, modular backend architecture.
- Built a modular backend on **PostgreSQL** with type-safe **REST/tRPC APIs** and
  authentication (NextAuth).

**Solana Developer — Turbin3 Pinocchio**  ·  Remote  ·  Sep 2025 – Nov 2025
- Acted as PM and contributor porting low-level programs; coordinated scope and delivery.

---

## Skills

**Languages:** Python, TypeScript, JavaScript, Rust, SQL
**AI/ML:** LLM integration (Anthropic, OpenAI, Google Vertex AI), OCR, document
classification, text extraction, embeddings & semantic / vector search,
retrieval-augmented Q&A, prompt design
**Backend & Data:** FastAPI, REST API design, PostgreSQL, pgvector, MongoDB, tRPC, Drizzle ORM
**Frontend:** React, TypeScript, Tailwind, Next.js
**Infra:** Docker, Vercel, Railway, Git
**SAP-adjacent:** BTP architecture mapping (Document Information Extraction, HANA Cloud +
Vector Engine, Azure OpenAI via Destination Service, UI5/Fiori) — designed POC as a direct blueprint

---

## Education

- **Turbin3** — Builders Cohort, Advanced SVM, Elite, Pinocchio, Magic Blocks · 2025 – Present
- **Master of Computer Application**, IGNOU, India · 2023 – 2025
- **B.Sc. Computer Science**, Osmania University, India · 2018 – 2021

---

## Open Source Contributions

- **Rust Compiler / Clippy** — merged contributions to the Rust toolchain:
  rust-lang/rustc_codegen_gcc #896, rust-lang/rust-clippy #17065 and #16486.
- **Solana ecosystem** — bug fixes and documentation for solana-foundation/templates,
  tape-drive, and yellowstone-vixen.

## Additional Projects

- **Menageri** — General-purpose Web3 CRM (PostgreSQL, backend architecture).
- **ZKSVM Rollup** — Zero-knowledge rollup on Solana's SVM with on-chain proof verification.

---

## Interests
Reading web novels · Guitar · Badminton
