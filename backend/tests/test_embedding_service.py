"""
Tests for EmbeddingService — chunking and embedding generation.
"""
from unittest.mock import MagicMock, patch


class TestChunkText:
    def test_long_text_produces_multiple_chunks(self):
        """chunk_text on a 1200-char string returns at least 2 chunks."""
        from services.embedding_service import EmbeddingService
        svc = EmbeddingService()
        chunks = svc.chunk_text("a" * 1200)
        assert len(chunks) >= 2

    def test_chunks_are_not_too_long(self):
        """Each chunk produced from a 1200-char string is ≤ 600 chars."""
        from services.embedding_service import EmbeddingService
        svc = EmbeddingService()
        chunks = svc.chunk_text("a" * 1200)
        for chunk in chunks:
            assert len(chunk) <= 600

    def test_short_text_produces_single_chunk(self):
        """Short text that fits in one chunk returns a list of exactly 1."""
        from services.embedding_service import EmbeddingService
        svc = EmbeddingService()
        chunks = svc.chunk_text("hello world")
        assert len(chunks) == 1
        assert chunks[0] == "hello world"


class TestEmbedChunksOpenAI:
    def test_embed_chunks_openai_returns_1536_dim_vectors(self):
        """embed_chunks with provider='openai' returns one 1536-float vector per chunk."""
        fake_vector = [0.1] * 1536
        fake_embedding = MagicMock()
        fake_embedding.embedding = fake_vector
        fake_response = MagicMock()
        fake_response.data = [fake_embedding]

        with patch("openai.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_openai_cls.return_value = mock_client
            mock_client.embeddings.create.return_value = fake_response

            from services.embedding_service import EmbeddingService
            svc = EmbeddingService()
            result = svc.embed_chunks(["hello"], provider="openai")

        assert len(result) == 1
        assert len(result[0]) == 1536
        assert all(isinstance(v, float) for v in result[0])


class TestEmbedChunksAnthropic:
    def test_embed_chunks_anthropic_returns_1536_dim_vectors(self):
        """embed_chunks with provider='anthropic' returns one 1536-float vector (padded)."""
        fake_1024_vector = [0.5] * 1024
        fake_voyage_result = MagicMock()
        fake_voyage_result.embeddings = [fake_1024_vector]

        with patch("services.embedding_service.voyageai") as mock_voyage:
            mock_client = MagicMock()
            mock_voyage.Client.return_value = mock_client
            mock_client.embed.return_value = fake_voyage_result

            from services.embedding_service import EmbeddingService
            svc = EmbeddingService()
            result = svc.embed_chunks(["hello"], provider="anthropic")

        assert len(result) == 1
        assert len(result[0]) == 1536
        assert all(isinstance(v, float) for v in result[0])

    def test_embed_chunks_anthropic_pads_1024_to_1536(self):
        """Voyage 1024-dim vectors are zero-padded to 1536 dimensions."""
        fake_1024_vector = [1.0] * 1024
        fake_voyage_result = MagicMock()
        fake_voyage_result.embeddings = [fake_1024_vector]

        with patch("services.embedding_service.voyageai") as mock_voyage:
            mock_client = MagicMock()
            mock_voyage.Client.return_value = mock_client
            mock_client.embed.return_value = fake_voyage_result

            from services.embedding_service import EmbeddingService
            svc = EmbeddingService()
            result = svc.embed_chunks(["hello"], provider="anthropic")

        # First 1024 values should be 1.0, last 512 should be 0.0
        assert result[0][:1024] == [1.0] * 1024
        assert result[0][1024:] == [0.0] * 512


class TestEmbedQuery:
    def test_embed_query_returns_single_vector(self):
        """embed_query returns a single float vector of 1536 dims."""
        fake_vector = [0.1] * 1536
        fake_embedding = MagicMock()
        fake_embedding.embedding = fake_vector
        fake_response = MagicMock()
        fake_response.data = [fake_embedding]

        with patch("openai.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_openai_cls.return_value = mock_client
            mock_client.embeddings.create.return_value = fake_response

            from services.embedding_service import EmbeddingService
            svc = EmbeddingService()
            result = svc.embed_query("find construction invoices", provider="openai")

        assert isinstance(result, list)
        assert len(result) == 1536
        assert all(isinstance(v, float) for v in result)
