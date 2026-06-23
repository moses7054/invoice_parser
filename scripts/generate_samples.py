"""
Generate realistic sample invoice PDFs into sample_invoices/.

Run once to (re)create the bundled demo invoices:
    python3 scripts/generate_samples.py

Produces 4 invoices with varied layouts, currencies, and one in German to
demonstrate multilingual extraction. Requires reportlab (dev-only dependency).
"""
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

OUT_DIR = Path(__file__).resolve().parent.parent / "sample_invoices"


def draw_invoice(path: Path, data: dict) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    left = 20 * mm
    right = width - 20 * mm
    y = height - 25 * mm

    L = data["labels"]

    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(left, y, L["title"])
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.grey)
    c.drawRightString(right, y, data["vendor"]["name"])
    c.setFillColor(colors.black)
    y -= 14 * mm

    # Meta (number / dates)
    c.setFont("Helvetica", 10)
    for label, value in [
        (L["number"], data["invoice_number"]),
        (L["date"], data["invoice_date"]),
        (L["due"], data["due_date"]),
        (L["po"], data.get("po", "")),
    ]:
        if not value:
            continue
        c.setFont("Helvetica-Bold", 10)
        c.drawString(left, y, f"{label}:")
        c.setFont("Helvetica", 10)
        c.drawString(left + 45 * mm, y, str(value))
        y -= 6 * mm
    y -= 4 * mm

    # From / To
    def block(x, heading, lines):
        yy = y
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x, yy, heading)
        yy -= 6 * mm
        c.setFont("Helvetica", 9)
        for line in lines:
            c.drawString(x, yy, line)
            yy -= 5 * mm
        return yy

    vend = data["vendor"]
    bill = data["bill_to"]
    y_from = block(left, L["from"], [vend["name"], *vend["address"]])
    y_to = block(left + 95 * mm, L["to"], [bill["name"], *bill["address"]])
    y = min(y_from, y_to) - 8 * mm

    # Line items header
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(left, y - 2 * mm, right - left, 8 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left + 2 * mm, y, L["desc"])
    c.drawRightString(left + 120 * mm, y, L["qty"])
    c.drawRightString(left + 145 * mm, y, L["unit"])
    c.drawRightString(right - 2 * mm, y, L["amount"])
    c.setFillColor(colors.black)
    y -= 9 * mm

    cur = data["currency_symbol"]
    c.setFont("Helvetica", 9)
    for item in data["line_items"]:
        c.drawString(left + 2 * mm, y, item["description"])
        c.drawRightString(left + 120 * mm, y, str(item["qty"]))
        c.drawRightString(left + 145 * mm, y, f"{cur}{item['unit']:,.2f}")
        c.drawRightString(right - 2 * mm, y, f"{cur}{item['amount']:,.2f}")
        y -= 6 * mm

    y -= 4 * mm
    c.line(left + 100 * mm, y, right, y)
    y -= 7 * mm

    # Totals
    def total_row(label, value, bold=False):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11 if bold else 9)
        c.drawRightString(left + 145 * mm, y, label)
        c.drawRightString(right - 2 * mm, y, f"{cur}{value:,.2f}")
        y -= 6 * mm

    total_row(L["subtotal"], data["subtotal"])
    total_row(f"{L['tax']} ({data['tax_rate']:.0%})", data["tax_amount"])
    total_row(L["total"], data["total"], bold=True)

    y -= 10 * mm
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(colors.grey)
    c.drawString(left, y, f"{L['terms']}: {data['payment_terms']}")
    c.drawString(left, y - 5 * mm, f"{L['currency']}: {data['currency']}")

    c.showPage()
    c.save()


EN = {
    "title": "INVOICE", "number": "Invoice Number", "date": "Invoice Date",
    "due": "Due Date", "po": "PO Number", "from": "FROM", "to": "BILL TO",
    "desc": "Description", "qty": "Qty", "unit": "Unit Price", "amount": "Amount",
    "subtotal": "Subtotal", "tax": "Tax", "total": "Total Due",
    "terms": "Payment Terms", "currency": "Currency",
}

DE = {
    "title": "RECHNUNG", "number": "Rechnungsnummer", "date": "Rechnungsdatum",
    "due": "Fälligkeitsdatum", "po": "Bestellnummer", "from": "VON", "to": "RECHNUNG AN",
    "desc": "Beschreibung", "qty": "Menge", "unit": "Einzelpreis", "amount": "Betrag",
    "subtotal": "Zwischensumme", "tax": "MwSt", "total": "Gesamtbetrag",
    "terms": "Zahlungsbedingungen", "currency": "Währung",
}


INVOICES = [
    {
        "file": "invoice_usd_tech.pdf", "labels": EN,
        "invoice_number": "INV-2024-0142", "invoice_date": "2024-01-15",
        "due_date": "2024-02-14", "po": "PO-88231",
        "currency": "USD", "currency_symbol": "$",
        "vendor": {"name": "TechCorp Solutions Ltd",
                   "address": ["123 Innovation Drive", "San Francisco, CA 94105", "United States"]},
        "bill_to": {"name": "Acme Corporation",
                    "address": ["456 Business Ave", "New York, NY 10001", "United States"]},
        "line_items": [
            {"description": "Enterprise Software License (Annual)", "qty": 5, "unit": 299.00, "amount": 1495.00},
            {"description": "Premium Technical Support", "qty": 1, "unit": 500.00, "amount": 500.00},
            {"description": "Onboarding & Training", "qty": 2, "unit": 350.00, "amount": 700.00},
        ],
        "subtotal": 2695.00, "tax_rate": 0.085, "tax_amount": 229.08, "total": 2924.08,
        "payment_terms": "Net 30",
    },
    {
        "file": "invoice_eur_german.pdf", "labels": DE,
        "invoice_number": "RE-2024-0079", "invoice_date": "2024-03-02",
        "due_date": "2024-03-16", "po": "BST-4471",
        "currency": "EUR", "currency_symbol": "€",
        "vendor": {"name": "Müller Beratung GmbH",
                   "address": ["Königsallee 27", "40212 Düsseldorf", "Deutschland"]},
        "bill_to": {"name": "Schneider Industrie AG",
                    "address": ["Hauptstraße 5", "80331 München", "Deutschland"]},
        "line_items": [
            {"description": "Strategieberatung (Tagessatz)", "qty": 4, "unit": 1200.00, "amount": 4800.00},
            {"description": "Workshop Moderation", "qty": 1, "unit": 950.00, "amount": 950.00},
            {"description": "Projektdokumentation", "qty": 1, "unit": 480.00, "amount": 480.00},
        ],
        "subtotal": 6230.00, "tax_rate": 0.19, "tax_amount": 1183.70, "total": 7413.70,
        "payment_terms": "Netto 14 Tage",
    },
    {
        "file": "invoice_gbp_construction.pdf", "labels": EN,
        "invoice_number": "INV-GB-3310", "invoice_date": "2024-02-20",
        "due_date": "2024-03-21", "po": "PO-GB-559",
        "currency": "GBP", "currency_symbol": "£",
        "vendor": {"name": "Thames Build & Co",
                   "address": ["88 Riverside Way", "London SE1 7TP", "United Kingdom"]},
        "bill_to": {"name": "Harborview Developments Ltd",
                    "address": ["12 Dockland Road", "Bristol BS1 6QH", "United Kingdom"]},
        "line_items": [
            {"description": "Site Preparation & Groundworks", "qty": 1, "unit": 8500.00, "amount": 8500.00},
            {"description": "Structural Steel Supply", "qty": 12, "unit": 640.00, "amount": 7680.00},
            {"description": "Concrete Pouring (m3)", "qty": 35, "unit": 95.00, "amount": 3325.00},
            {"description": "Labour (hours)", "qty": 120, "unit": 42.00, "amount": 5040.00},
        ],
        "subtotal": 24545.00, "tax_rate": 0.20, "tax_amount": 4909.00, "total": 29454.00,
        "payment_terms": "Net 30",
    },
    {
        "file": "invoice_inr_logistics.pdf", "labels": EN,
        "invoice_number": "INV-IN-2207", "invoice_date": "2024-04-05",
        "due_date": "2024-04-20", "po": "PO-IN-1180",
        "currency": "INR", "currency_symbol": "Rs ",
        "vendor": {"name": "Bharat Logistics Pvt Ltd",
                   "address": ["Plot 14, MIDC Industrial Area", "Pune, Maharashtra 411019", "India"]},
        "bill_to": {"name": "Sunrise Exports Pvt Ltd",
                    "address": ["7 Marine Lines", "Mumbai, Maharashtra 400020", "India"]},
        "line_items": [
            {"description": "Freight Forwarding (Container)", "qty": 3, "unit": 45000.00, "amount": 135000.00},
            {"description": "Customs Clearance", "qty": 1, "unit": 18000.00, "amount": 18000.00},
            {"description": "Warehousing (30 days)", "qty": 1, "unit": 22000.00, "amount": 22000.00},
        ],
        "subtotal": 175000.00, "tax_rate": 0.18, "tax_amount": 31500.00, "total": 206500.00,
        "payment_terms": "Net 15",
    },
]


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    for inv in INVOICES:
        path = OUT_DIR / inv["file"]
        draw_invoice(path, inv)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
