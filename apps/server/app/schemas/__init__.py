"""API schemas."""

from .video import (
    VideoRead,
    VideoListResponse,
    VideoUploadResponse,
)
from .search import (
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
