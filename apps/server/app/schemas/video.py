"""Video-related schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.models.video import VideoStatus


class VideoRead(BaseModel):
    """Schema for reading video data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    original_path: str
    thumbnail_path: str | None
    file_size: int | None
    duration: float | None
    width: int | None
    height: int | None
    status: VideoStatus
    error_message: str | None
    frame_count: int
    keyframe_count: int
    created_at: datetime
    updated_at: datetime
    processed_at: datetime | None


class VideoListResponse(BaseModel):
    """Response schema for video list."""

    videos: list[VideoRead]
    total: int
    page: int
    page_size: int


class VideoUploadResponse(BaseModel):
    """Response after video upload."""

    id: UUID
    filename: str
    status: VideoStatus
    message: str
