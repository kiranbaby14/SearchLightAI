"""Video model definition."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.transcript import Transcript


class VideoStatus(str, Enum):
    """Video processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    EXTRACTING_FRAMES = "extracting_frames"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    EMBEDDING = "embedding"
    COMPLETED = "completed"
    FAILED = "failed"


class Video(SQLModel, table=True):
    """Video metadata model."""

    __tablename__ = "videos"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    filename: str = Field(index=True)
    original_path: str
    thumbnail_path: str | None = None
    file_size: int | None = None
    duration: float | None = None  # Duration in seconds
    width: int | None = None
    height: int | None = None
    fps: float | None = None

    status: VideoStatus = Field(default=VideoStatus.PENDING, index=True)
    error_message: str | None = None

    frame_count: int = Field(default=0)
    keyframe_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime | None = None

    # Relationships
    transcripts: list["Transcript"] = Relationship(back_populates="video")

    def mark_processing(self, status: VideoStatus) -> None:
        """Update status and timestamp."""
        self.status = status
        self.updated_at = datetime.utcnow()

    def mark_completed(self) -> None:
        """Mark video as successfully processed."""
        self.status = VideoStatus.COMPLETED
        self.updated_at = datetime.utcnow()
        self.processed_at = datetime.utcnow()

    def mark_failed(self, error: str) -> None:
        """Mark video as failed with error message."""
        self.status = VideoStatus.FAILED
        self.error_message = error
        self.updated_at = datetime.utcnow()
