"""Embedding service for visual and text embeddings."""

from pathlib import Path

import torch
from PIL import Image
from transformers import AutoProcessor, AutoModel
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingService:
    """Service for generating embeddings from images and text."""

    def __init__(self) -> None:
        """Initialize embedding service."""
        self._siglip_model: AutoModel | None = None
        self._siglip_processor: AutoProcessor | None = None
        self._sentence_model: SentenceTransformer | None = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    @property
    def siglip_model(self) -> AutoModel:
        """Lazy load SigLIP model."""
        if self._siglip_model is None:
            logger.info("loading_siglip_model", model=settings.siglip_model)
            self._siglip_model = AutoModel.from_pretrained(settings.siglip_model).to(
                self._device
            )
            self._siglip_model.eval()
            logger.info("siglip_model_loaded", device=self._device)
        return self._siglip_model

    @property
    def siglip_processor(self) -> AutoProcessor:
        """Lazy load SigLIP processor."""
        if self._siglip_processor is None:
            self._siglip_processor = AutoProcessor.from_pretrained(
                settings.siglip_model
            )
        return self._siglip_processor

    @property
    def sentence_model(self) -> SentenceTransformer:
        """Lazy load sentence transformer model."""
        if self._sentence_model is None:
            logger.info(
                "loading_sentence_model",
                model=settings.sentence_transformer_model,
            )
            self._sentence_model = SentenceTransformer(
                settings.sentence_transformer_model,
                device=self._device,
            )
            logger.info("sentence_model_loaded", device=self._device)
        return self._sentence_model

    def embed_image(self, image_path: str) -> list[float]:
        """
        Generate embedding for an image.

        Returns embedding vector as list of floats.
        """
        image = Image.open(image_path).convert("RGB")

        inputs = self.siglip_processor(
            images=image,
            return_tensors="pt",
        ).to(self._device)

        with torch.no_grad():
            outputs = self.siglip_model.get_image_features(**inputs)
            embedding = outputs[0].cpu().numpy().tolist()

        return embedding

    def embed_images_batch(
        self,
        image_paths: list[str],
        batch_size: int = 16,
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple images.

        Returns list of embedding vectors.
        """
        logger.info("embedding_images_batch", count=len(image_paths))

        all_embeddings = []

        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i : i + batch_size]
            images = [Image.open(p).convert("RGB") for p in batch_paths]

            inputs = self.siglip_processor(
                images=images,
                return_tensors="pt",
                padding=True,
            ).to(self._device)

            with torch.no_grad():
                outputs = self.siglip_model.get_image_features(**inputs)
                embeddings = outputs.cpu().numpy().tolist()
                all_embeddings.extend(embeddings)

        logger.info("images_embedded", count=len(all_embeddings))
        return all_embeddings

    def embed_text_visual(self, text: str) -> list[float]:
        """
        Generate visual-compatible embedding for text query.

        Uses SigLIP for visual search queries.
        """
        inputs = self.siglip_processor(
            text=[text],
            return_tensors="pt",
            padding=True,
        ).to(self._device)

        with torch.no_grad():
            outputs = self.siglip_model.get_text_features(**inputs)
            embedding = outputs[0].cpu().numpy().tolist()

        return embedding

    def embed_text(self, text: str) -> list[float]:
        """
        Generate text embedding for semantic search.

        Uses sentence-transformers for speech/text search.
        """
        embedding = self.sentence_model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embedding.tolist()

    def embed_texts_batch(
        self,
        texts: list[str],
        batch_size: int = 32,
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Returns list of embedding vectors.
        """
        logger.info("embedding_texts_batch", count=len(texts))

        embeddings = self.sentence_model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        logger.info("texts_embedded", count=len(embeddings))
        return embeddings.tolist()
