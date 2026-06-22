from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Invoice Parser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.invoices import router as invoices_router, SAMPLE_DIR, ALLOWED_SAMPLE_EXTENSIONS  # noqa: E402
from routers.qa import router as qa_router  # noqa: E402
app.include_router(invoices_router)
app.include_router(qa_router, prefix="/qa")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/sample-invoices", tags=["invoices"])
def list_sample_invoices():
    """List available sample invoice files."""
    files = []
    if SAMPLE_DIR.exists():
        for f in sorted(SAMPLE_DIR.iterdir()):
            if f.suffix.lower() in ALLOWED_SAMPLE_EXTENSIONS and not f.name.startswith("."):
                files.append({
                    "filename": f.name,
                    "display_name": f.stem.replace("_", " ").title(),
                })
    return files
