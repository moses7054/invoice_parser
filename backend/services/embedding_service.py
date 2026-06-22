"""
EmbeddingService — text chunking and embedding generation.

Supports two embedding providers:
  - "anthropic": Voyage AI (voyage-3, 1024-dim, padded to 1536)
  - "openai":    text-embedding-3-small (1536-dim)

voyageai is optional — if not installed, a hash-based mock embedding is used
so that tests pass without real API keys.
"""
import os
import hashlib
from typing import Optional

import openai

try:
    import voyageai  # type: ignore
except ImportError:  # pragma: no cover
    voyageai = None  # type: ignore[assignment]

_EMBEDDING_DIM = 1536
_VOYAGE_DIM = 1024


def _mock_embedding(text: str, dim: int = _EMBEDDING_DIM) -> list[float]:
    """Deterministic hash-based mock embedding for test environments."""
    digest = hashlib.sha256(text.encode()).digest()
    # Expand to `dim` floats by cycling through bytes
    floats = []
    for i in range(dim):
        floats.append((digest[i % len(digest)] / 255.0) - 0.5)
    return floats


def _pad_to_1536(vec: list[float]) -> list[float]:
    """Zero-pad a vector to 1536 dimensions."""
    if len(vec) >= _EMBEDDING_DIM:
        return vec[:_EMBEDDING_DIM]
    return vec + [0.0] * (_EMBEDDING_DIM - len(vec))


class EmbeddingService:
    def chunk_text(self, text: str, chunk_size: int = 500) -> list[str]:
        """
        Split text into overlapping chunks of ~chunk_size chars.
        Uses 50-char overlap to preserve context across chunk boundaries.
        """
        if len(text) <= chunk_size:
            return [text]

        overlap = 50
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            if end >= len(text):
                break
            start = end - overlap
        return chunks

    def embed_chunks(self, chunks: list[str], provider: str = "anthropic") -> list[list[float]]:
        """
        Generate embeddings for each chunk.

        provider="anthropic": voyage-3 via voyageai SDK (1024-dim, padded to 1536)
        provider="openai":    text-embedding-3-small (1536-dim)
        """
        if provider == "openai":
            client = openai.OpenAI()
            response = client.embeddings.create(
                input=chunks,
                model="text-embedding-3-small",
            )
            return [item.embedding for item in response.data]

        # Anthropic / Voyage path
        if voyageai is not None:
            voyage_client = voyageai.Client(
                api_key=os.getenv("VOYAGE_API_KEY", os.getenv("ANTHROPIC_API_KEY"))
            )
            result = voyage_client.embed(chunks, model="voyage-3")
            return [_pad_to_1536(list(vec)) for vec in result.embeddings]

        # Fallback: mock embeddings (no voyageai installed)
        return [_mock_embedding(chunk) for chunk in chunks]  # pragma: no cover

    def embed_query(self, query: str, provider: str = "anthropic") -> list[float]:
        """Embed a single query string and return a 1536-dim float vector."""
        results = self.embed_chunks([query], provider=provider)
        return results[0]
