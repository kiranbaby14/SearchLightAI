"""Search-related schemas."""

from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field


class SearchType(str, Enum):
    """Type of search to perform."""

    VISUAL = "visual"
    SPEECH = "speech"
    HYBRID = "hybrid"


class SearchQuery(BaseModel):
    """Search query schema."""

    query: str = Field(..., min_length=1, max_length=500)
    search_type: SearchType = SearchType.HYBRID
    limit: int = Field(default=10, ge=1, le=50)
    threshold: float = Field(default=0.1, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Individual search result."""

    video_id: UUID
    video_filename: str
    timestamp: float  # In seconds
    end_timestamp: float | None = None
    score: float
    result_type: str  # "visual" or "speech"
    transcript_text: str | None = None
    frame_path: str | None = None


class SearchResponse(BaseModel):
    """Search response schema."""

    query: str
    search_type: SearchType
    results: list[SearchResult]
    total_results: int
