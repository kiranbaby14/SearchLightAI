"""Embedding service for visual and text embeddings."""

import torch
import torch.nn.functional as F
from PIL import Image
from transformers import (
    AutoProcessor,
    SiglipVisionModel,
    SiglipTextModel,
)
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingService:
    """Service for generating embeddings from images and text."""

    def __init__(self) -> None:
        """Initialize embedding service."""
        self._siglip_processor: AutoProcessor | None = None
        self._siglip_vision: SiglipVisionModel | None = None
        self._siglip_text: SiglipTextModel | None = None
        self._sentence_model: SentenceTransformer | None = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def load_models(self) -> None:
        """Preload all models. Must be called at startup."""
        logger.info("loading_embedding_models", device=self._device)

        # Load SigLIP processor
        logger.info("loading_siglip_processor", model=settings.siglip_model)
        self._siglip_processor = AutoProcessor.from_pretrained(
            settings.siglip_model,
            use_fast=True,  # rust based tokenizer
        )

        # Load SigLIP vision model
        logger.info("loading_siglip_vision", model=settings.siglip_model)
        self._siglip_vision = SiglipVisionModel.from_pretrained(
            settings.siglip_model
        ).to(self._device)
        self._siglip_vision.eval()

        # Load SigLIP text model
        logger.info("loading_siglip_text", model=settings.siglip_model)
        self._siglip_text = SiglipTextModel.from_pretrained(settings.siglip_model).to(
            self._device
        )
        self._siglip_text.eval()

        # Load sentence transformer
        logger.info("loading_sentence_model", model=settings.sentence_transformer_model)
        self._sentence_model = SentenceTransformer(
            settings.sentence_transformer_model,
            device=self._device,
        )

        logger.info("embedding_models_loaded")

    def _get_processor(self) -> AutoProcessor:
        if self._siglip_processor is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._siglip_processor

    def _get_vision_model(self) -> SiglipVisionModel:
        if self._siglip_vision is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._siglip_vision

    def _get_text_model(self) -> SiglipTextModel:
        if self._siglip_text is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._siglip_text

    def _get_sentence_model(self) -> SentenceTransformer:
        if self._sentence_model is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._sentence_model

    def _normalize(self, embeddings: torch.Tensor) -> torch.Tensor:
        """L2 normalize embeddings for cosine similarity."""
        return F.normalize(embeddings, p=2, dim=-1)

    def embed_image(self, image_path: str) -> list[float]:
        """Generate embedding for an image using SigLIP Vision Model."""
        image = Image.open(image_path).convert("RGB")
        inputs = self._get_processor()(images=image, return_tensors="pt").to(
            self._device
        )

        with torch.no_grad():
            outputs = self._get_vision_model()(**inputs)
            normalized = self._normalize(outputs.pooler_output)
            embedding = normalized[0].cpu().numpy().tolist()

        return embedding

    def embed_images_batch(
        self,
        image_paths: list[str],
        batch_size: int = 16,
    ) -> list[list[float]]:
        """Generate embeddings for multiple images in batches."""
        logger.info("embedding_images_batch", count=len(image_paths))
        all_embeddings = []

        processor = self._get_processor()
        vision_model = self._get_vision_model()

        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i : i + batch_size]
            images = []
            for p in batch_paths:
                try:
                    images.append(Image.open(p).convert("RGB"))
                except Exception as e:
                    logger.error("image_load_failed", path=p, error=str(e))
                    continue

            if not images:
                continue

            inputs = processor(
                images=images,
                return_tensors="pt",
                padding=True,
            ).to(self._device)

            with torch.no_grad():
                outputs = vision_model(**inputs)
                normalized = self._normalize(outputs.pooler_output)
                embeddings = normalized.cpu().numpy().tolist()
                all_embeddings.extend(embeddings)

        return all_embeddings

    def embed_text_visual(self, text: str) -> list[float]:
        """Generate visual-compatible embedding for text queries (SigLIP)."""
        inputs = self._get_processor()(
            text=[text],
            padding="max_length",
            return_tensors="pt",
        ).to(self._device)

        with torch.no_grad():
            outputs = self._get_text_model()(**inputs)
            normalized = self._normalize(outputs.pooler_output)
            embedding = normalized[0].cpu().numpy().tolist()

        return embedding

    def embed_text(self, text: str) -> list[float]:
        """Generate text embedding for semantic search (Sentence-Transformers)."""
        embedding = self._get_sentence_model().encode(
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
        """Generate embeddings for multiple texts using sentence-transformers."""
        logger.info("embedding_texts_batch", count=len(texts))
        embeddings = self._get_sentence_model().encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.tolist()
