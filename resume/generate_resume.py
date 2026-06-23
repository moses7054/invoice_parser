"""Generate a clean, ATS-friendly PDF resume tailored to the AI/ML SAP DMS role.

    python3 resume/generate_resume.py
"""
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem,
)

OUT = Path(__file__).resolve().parent / "Moses_Navarag_AI_ML.pdf"
ACCENT = colors.HexColor("#1f4e79")
DARK = colors.HexColor("#1a1a1a")
GREY = colors.HexColor("#444444")

styles = getSampleStyleSheet()
name = ParagraphStyle("name", parent=styles["Title"], fontName="Helvetica-Bold",
                      fontSize=20, textColor=DARK, alignment=TA_CENTER, spaceAfter=2)
contact = ParagraphStyle("contact", parent=styles["Normal"], fontSize=8.5,
                         textColor=GREY, alignment=TA_CENTER, spaceAfter=2)
summary = ParagraphStyle("summary", parent=styles["Normal"], fontSize=9,
                         textColor=GREY, leading=12.5, spaceBefore=4, spaceAfter=2)
section = ParagraphStyle("section", parent=styles["Heading2"], fontName="Helvetica-Bold",
                         fontSize=11, textColor=ACCENT, spaceBefore=10, spaceAfter=2)
job = ParagraphStyle("job", parent=styles["Normal"], fontName="Helvetica-Bold",
                     fontSize=9.5, textColor=DARK, spaceBefore=5, spaceAfter=0)
meta = ParagraphStyle("meta", parent=styles["Normal"], fontName="Helvetica-Oblique",
                      fontSize=8.5, textColor=GREY, spaceAfter=2)
bullet = ParagraphStyle("bullet", parent=styles["Normal"], fontSize=9,
                        textColor=GREY, leading=12)
normal = ParagraphStyle("n", parent=styles["Normal"], fontSize=9, textColor=GREY, leading=12)


def rule():
    return HRFlowable(width="100%", thickness=0.8, color=ACCENT,
                      spaceBefore=1, spaceAfter=3)


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(t, bullet), leftIndent=10, value="•") for t in items],
        bulletType="bullet", bulletColor=ACCENT, bulletFontSize=7,
        leftIndent=12, spaceBefore=1, spaceAfter=1,
    )


def b(text):
    return f"<b>{text}</b>"


story = []

# Header
story += [
    Paragraph("V Moses Navarag", name),
    Paragraph("Hyderabad, India &nbsp;·&nbsp; moses7054@gmail.com &nbsp;·&nbsp; "
              "linkedin.com/in/vaddi-moses &nbsp;·&nbsp; github.com/moses7054", contact),
    Paragraph(
        "Full-stack and AI/ML application developer who builds end-to-end document-processing "
        "systems — OCR, LLM-based extraction, and semantic search over relational and vector "
        "data. Strong in Python, REST API design, and PostgreSQL, with hands-on experience "
        "integrating LLM platforms (Anthropic, OpenAI, Google Vertex AI) and shipping "
        "production apps on Docker. Built and deployed an AI Document Management POC explicitly "
        "architected as a blueprint for the SAP BTP / HANA Cloud / Azure OpenAI stack.", summary),
]

# Featured Projects
story += [Paragraph("Featured Projects", section), rule()]

story += [
    Paragraph("AI-Powered Invoice Parser — Document Management System  ·  parseinvoice.xyz", job),
    Paragraph("Python · FastAPI · React/TypeScript · PostgreSQL + pgvector · Claude / GPT-4o · Docker", meta),
    bullets([
        f"Built a document pipeline that ingests {b('PDFs and images')}, runs {b('OCR')} "
        "(Tesseract) and text extraction, then uses an LLM to extract 13+ structured fields "
        "plus line items into a typed schema, with a JSONB catch-all for non-standard fields.",
        f"Implemented {b('hybrid Q&amp;A')}: a pure intent router sends aggregate questions to SQL "
        f"and meaning-based questions to {b('semantic vector search')} over pgvector embeddings, "
        "citing source documents for each answer.",
        f"Designed a {b('provider-agnostic LLM layer')} with live switching between Claude and "
        f"GPT-4o for extraction and Q&amp;A — analogous to swapping an {b('Azure OpenAI')} deployment "
        "via the SAP BTP Destination Service.",
        f"Built and consumed {b('REST APIs')} (FastAPI) and designed the relational + vector "
        f"{b('data model')} on PostgreSQL + pgvector — the open-source equivalent of "
        f"{b('HANA Cloud + HANA Vector Engine')}.",
        f"Developed the {b('document upload, search, and detail UI')} in React/TypeScript "
        "(analogous to UI5/Fiori) and deployed with Docker (Railway + Vercel) on a custom domain.",
        "Validated multilingual extraction (English + German) and wrote a 30-test integration "
        "and unit suite.",
    ]),
]

story += [
    Paragraph("Compliance Document Scanner — AI Due-Diligence Tool", job),
    Paragraph("Google Vertex AI · Python · Document analysis", meta),
    bullets([
        f"Used {b('Google Vertex AI')} to analyse documents from companies seeking investment "
        f"and classify them against {b('US and EU regulatory frameworks')}.",
        f"Determined which laws each company is {b('required to comply')} with and flagged "
        f"{b('current non-compliance')} — turning unstructured legal/operational docs into a "
        "structured compliance report.",
        "Demonstrates AI/ML document classification and semantic understanding on a second "
        "major cloud AI platform, complementing the Anthropic/OpenAI work above.",
    ]),
]

# Work Experience
story += [Paragraph("Work Experience", section), rule()]
jobs = [
    ("Teacher — Turbin3 (Builders Cohort)", "Remote · Apr 2025 – Present", [
        "Mentor developers building backend systems and on-chain programs; lead office hours, "
        "breakout rooms, and code reviews.",
        "Help students ideate and ship capstone projects end-to-end.",
    ]),
    ("Full-Stack Developer — Syntax Studios (Contract)", "Remote · Oct 2025 – Nov 2025", [
        "Designed, built, and tested backend programs from client requirements, producing clear "
        "architectural diagrams and technical specifications.",
        "Wrote TypeScript integration scripts to exercise and validate services end-to-end.",
    ]),
    ("Backend Lead — Menagerie (Turbin3 Elite)", "Remote · Apr 2025 – Jun 2025", [
        "Led the design of a scalable, modular backend architecture.",
        "Built a modular backend on PostgreSQL with type-safe REST/tRPC APIs and "
        "authentication (NextAuth).",
    ]),
    ("Solana Developer — Turbin3 Pinocchio", "Remote · Sep 2025 – Nov 2025", [
        "Acted as PM and contributor porting low-level programs; coordinated scope and delivery.",
    ]),
]
for title, m, bs in jobs:
    story += [Paragraph(title, job), Paragraph(m, meta), bullets(bs)]

# Skills
story += [Paragraph("Skills", section), rule()]
skills = [
    ("Languages", "Python, TypeScript, JavaScript, Rust, SQL"),
    ("AI/ML", "LLM integration (Anthropic, OpenAI, Google Vertex AI), OCR, document "
              "classification, text extraction, embeddings & semantic/vector search, "
              "retrieval-augmented Q&amp;A, prompt design"),
    ("Backend & Data", "FastAPI, REST API design, PostgreSQL, pgvector, MongoDB, tRPC, Drizzle ORM"),
    ("Frontend", "React, TypeScript, Tailwind, Next.js"),
    ("Infra", "Docker, Vercel, Railway, Git"),
    ("SAP-adjacent", "BTP architecture mapping — Document Information Extraction, HANA Cloud + "
                     "Vector Engine, Azure OpenAI via Destination Service, UI5/Fiori"),
]
for k, v in skills:
    story.append(Paragraph(f"{b(k)}: {v}", normal))

# Open Source
story += [Paragraph("Open Source Contributions", section), rule()]
story.append(bullets([
    f"{b('Rust Compiler / Clippy')} — merged contributions to the Rust toolchain: "
    "rust-lang/rustc_codegen_gcc #896, rust-lang/rust-clippy #17065 and #16486.",
    f"{b('Solana ecosystem')} — bug fixes and documentation for solana-foundation/templates, "
    "tape-drive, and yellowstone-vixen.",
]))

# Education
story += [Paragraph("Education", section), rule()]
story.append(bullets([
    f"{b('Turbin3')} — Builders Cohort, Advanced SVM, Elite, Pinocchio, Magic Blocks · 2025 – Present",
    f"{b('Master of Computer Application')}, IGNOU, India · 2023 – 2025",
    f"{b('B.Sc. Computer Science')}, Osmania University, India · 2018 – 2021",
]))

doc = SimpleDocTemplate(
    str(OUT), pagesize=LETTER,
    leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    topMargin=0.5 * inch, bottomMargin=0.5 * inch,
    title="V Moses Navarag — Resume", author="V Moses Navarag",
)
doc.build(story)
print(f"wrote {OUT}")
