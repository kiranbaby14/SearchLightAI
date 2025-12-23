"""API schemas."""

from app.schemas.video import (
    VideoRead,
    VideoListResponse,
    VideoUploadResponse,
)
from app.schemas.search import (
    SearchQuery,
    SearchResult,
    SearchResponse,
    SearchType,
)

__all__ = [
    "VideoRead",
    "VideoListResponse",
    "VideoUploadResponse",
    "SearchQuery",
    "SearchResult",
    "SearchResponse",
    "SearchType",
]
