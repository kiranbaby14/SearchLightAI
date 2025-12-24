"""Embedding service for visual and text embeddings."""

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
        self._processor: AutoProcessor | None = None
        self._model: AutoModel | None = None
        self._sentence_model: SentenceTransformer | None = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def load_models(self) -> None:
        """Preload all models. Must be called at startup."""
        logger.info("loading_embedding_models", device=self._device)

        # Load SigLIP2 (unified model for both vision and text)
        logger.info("loading_siglip2_model", model=settings.siglip_model)
        self._processor = AutoProcessor.from_pretrained(
            settings.siglip_model,
            use_fast=True,
        )
        self._model = AutoModel.from_pretrained(
            settings.siglip_model,
            dtype=torch.float16,
            attn_implementation="sdpa",
        ).to(self._device)
        self._model.eval()

        # Load sentence transformer for speech embeddings
        logger.info("loading_sentence_model", model=settings.sentence_transformer_model)
        self._sentence_model = SentenceTransformer(
            settings.sentence_transformer_model,
            device=self._device,
        )

        logger.info("embedding_models_loaded")

    def _get_model(self) -> AutoModel:
        if self._model is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._model

    def _get_processor(self) -> AutoProcessor:
        if self._processor is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._processor

    def _get_sentence_model(self) -> SentenceTransformer:
        if self._sentence_model is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        return self._sentence_model

    def embed_image(self, image_path: str) -> list[float]:
        """Generate embedding for an image using SigLIP2."""
        image = Image.open(image_path).convert("RGB")
        inputs = self._get_processor()(images=image, return_tensors="pt").to(
            self._device
        )

        with torch.no_grad():
            image_features = self._get_model().get_image_features(**inputs)

        return image_features[0].cpu().float().numpy().tolist()

    def embed_images_batch(
        self,
        image_paths: list[str],
        batch_size: int = 16,
    ) -> list[list[float]]:
        """Generate embeddings for multiple images in batches."""
        logger.info("embedding_images_batch", count=len(image_paths))
        all_embeddings = []

        model = self._get_model()
        processor = self._get_processor()

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

            inputs = processor(images=images, return_tensors="pt", padding=True).to(
                self._device
            )

            with torch.no_grad():
                image_features = model.get_image_features(**inputs)
                embeddings = image_features.cpu().float().numpy().tolist()
                all_embeddings.extend(embeddings)

        return all_embeddings

    def embed_text_visual(self, text: str) -> list[float]:
        """Generate visual-compatible embedding for text queries (SigLIP2)."""
        # IMPORTANT: Model was trained with lowercased text
        text = text.lower()

        inputs = self._get_processor()(
            text=[text],
            padding="max_length",
            max_length=64,
            return_tensors="pt",
        ).to(self._device)

        with torch.no_grad():
            text_features = self._get_model().get_text_features(**inputs)

        return text_features[0].cpu().float().numpy().tolist()

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
