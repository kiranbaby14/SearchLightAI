"""Transcript model definition."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.video import Video


class Transcript(SQLModel, table=True):
    """Transcript segment model."""

    __tablename__ = "transcripts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    video_id: UUID = Field(foreign_key="videos.id", index=True)

    text: str
    start_time: float  # Start time in seconds
    end_time: float  # End time in seconds

    confidence: float | None = None
    language: str | None = None

    # For full-text search
    search_vector: str | None = Field(default=None, sa_column_kwargs={"index": True})

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    video: "Video" = Relationship(back_populates="transcripts")

    @property
    def duration(self) -> float:
        """Get segment duration in seconds."""
        return self.end_time - self.start_time
