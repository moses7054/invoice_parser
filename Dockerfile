FROM python:3.11-slim

# Tesseract is required by pytesseract for image (JPG/PNG) OCR.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# App code + bundled sample invoices (samples live at repo root).
COPY backend/ ./backend/
COPY sample_invoices/ ./sample_invoices/

WORKDIR /app/backend

# Railway injects $PORT; default to 8000 for local docker runs.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
