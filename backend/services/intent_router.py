"""
intent_router: classify a Q&A question as 'structured' (SQL path) or 'semantic' (vector path).

Pure function — no network calls, no LLM imports.
"""
from typing import Literal
import re


def intent_router(question: str) -> Literal["structured", "semantic"]:
    """
    Classify question as 'structured' (SQL) or 'semantic' (vector).

    Heuristics:
    - Aggregation keywords  →  structured
    - Amount/date keywords  →  structured
    - Everything else       →  semantic
    """
    q = question.lower()
    aggregation_keywords = {
        "sum", "total", "count", "max", "min", "compare",
        "highest", "lowest", "how many", "average", "most", "least",
    }
    date_amount_pattern = re.compile(
        r'\b(amount|price|cost|date|year|month|quarter|\d{4})\b'
    )

    if any(kw in q for kw in aggregation_keywords) or date_amount_pattern.search(q):
        return "structured"
    return "semantic"
