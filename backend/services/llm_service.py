"""
LLMService: extract structured invoice data from raw markdown text using an LLM.

Supported providers:
  - "anthropic": Claude claude-sonnet-4-6
  - "openai":    GPT-4o with JSON mode
"""
import json
import os
from typing import Any, Dict

EXTRACTION_PROMPT = """You are an expert invoice data extractor. Extract the following fields from the invoice text below and return them as a single JSON object. Return JSON only — no markdown fences, no explanatory text.

Fields to extract:
- invoice_number (string)
- vendor_name (string)
- vendor_address (string)
- bill_to (string)
- invoice_date (ISO date string, e.g. "2024-01-15")
- due_date (ISO date string)
- subtotal (number)
- tax_amount (number)
- tax_rate (number, as a decimal e.g. 0.1 for 10%)
- total_amount (number)
- currency (3-letter ISO code, e.g. "USD")
- payment_terms (string)
- purchase_order_number (string)
- line_items (array of objects with keys: description, quantity, unit_price, amount, currency)
- metadata (object — put any extra/non-standard fields here)

Invoice text:
\"\"\"
{raw_text}
\"\"\"

Return only valid JSON."""


class LLMService:
    def extract_invoice(self, raw_text: str, provider: str = "anthropic") -> Dict[str, Any]:
        """Extract structured invoice data from raw markdown text.

        Args:
            raw_text: Markdown text extracted from the invoice document.
            provider: LLM provider to use. One of "anthropic" or "openai".

        Returns:
            dict with invoice fields matching InvoiceExtracted model.
        """
        prompt = EXTRACTION_PROMPT.format(raw_text=raw_text)

        if provider == "anthropic":
            return self._extract_anthropic(prompt)
        elif provider == "openai":
            return self._extract_openai(prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider!r}. Use 'anthropic' or 'openai'.")

    def _extract_anthropic(self, prompt: str) -> Dict[str, Any]:
        import anthropic  # type: ignore

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_json = message.content[0].text
        return json.loads(raw_json)

    def _extract_openai(self, prompt: str) -> Dict[str, Any]:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        raw_json = response.choices[0].message.content
        return json.loads(raw_json)
