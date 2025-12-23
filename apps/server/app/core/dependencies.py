"""API dependencies for dependency injection."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.services import (
    VideoProcessorService,
    AudioExtractorService,
    TranscriptionService,
    EmbeddingService,
    VectorStoreService,
)


# Database session dependency
SessionDep = Annotated[AsyncSession, Depends(get_session)]


# Service singletons
@lru_cache
def get_video_processor() -> VideoProcessorService:
    """Get video processor service."""
    return VideoProcessorService()


@lru_cache
def get_audio_extractor() -> AudioExtractorService:
    """Get audio extractor service."""
    return AudioExtractorService()


@lru_cache
def get_transcription_service() -> TranscriptionService:
    """Get transcription service."""
    return TranscriptionService()


@lru_cache
def get_embedding_service() -> EmbeddingService:
    """Get embedding service."""
    return EmbeddingService()


@lru_cache
def get_vector_store() -> VectorStoreService:
    """Get vector store service."""
    return VectorStoreService()


# Annotated dependencies for cleaner route signatures
VideoProcessorDep = Annotated[VideoProcessorService, Depends(get_video_processor)]
AudioExtractorDep = Annotated[AudioExtractorService, Depends(get_audio_extractor)]
TranscriptionDep = Annotated[TranscriptionService, Depends(get_transcription_service)]
EmbeddingDep = Annotated[EmbeddingService, Depends(get_embedding_service)]
VectorStoreDep = Annotated[VectorStoreService, Depends(get_vector_store)]
