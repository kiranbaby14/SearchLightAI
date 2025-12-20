"""Video management routes."""

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from sqlmodel import select

from app.api.dependencies import (
    SessionDep,
    VideoProcessorDep,
    AudioExtractorDep,
    TranscriptionDep,
    EmbeddingDep,
    VectorStoreDep,
)
from app.services import (
    VideoProcessorService,
    AudioExtractorService,
    TranscriptionService,
    EmbeddingService,
    VectorStoreService,
)
from app.core.database import async_session_factory
from app.core.config import get_settings
from app.core.logging import get_logger
from app.models import Video, VideoStatus, Transcript
from app.schemas import VideoCreate, VideoRead, VideoListResponse, VideoUploadResponse

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()


@router.get("", response_model=VideoListResponse)
async def list_videos(
    session: SessionDep,
    page: int = 1,
    page_size: int = 20,
) -> VideoListResponse:
    """List all videos with pagination."""
    offset = (page - 1) * page_size

    # Get videos
    result = await session.execute(
        select(Video).order_by(Video.created_at.desc()).offset(offset).limit(page_size)
    )
    videos = result.scalars().all()

    # Get total count
    count_result = await session.execute(select(Video))
    total = len(count_result.scalars().all())

    return VideoListResponse(
        videos=[VideoRead.model_validate(v) for v in videos],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(
    video_id: UUID,
    session: SessionDep,
) -> VideoRead:
    """Get a single video by ID."""
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return VideoRead.model_validate(video)


@router.post("", response_model=VideoUploadResponse)
async def add_video(
    video_data: VideoCreate,
    session: SessionDep,
    background_tasks: BackgroundTasks,
    video_processor: VideoProcessorDep,
    audio_extractor: AudioExtractorDep,
    transcription: TranscriptionDep,
    embedding: EmbeddingDep,
    vector_store: VectorStoreDep,
) -> VideoUploadResponse:
    """Add a video for indexing from a file path."""
    file_path = Path(video_data.file_path)

    if not file_path.exists():
        raise HTTPException(status_code=400, detail="Video file not found")

    # Get video info
    try:
        video_info = video_processor.get_video_info(str(file_path))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create video record
    video = Video(
        filename=file_path.name,
        original_path=str(file_path),
        file_size=video_info.get("file_size"),
        duration=video_info.get("duration"),
        width=video_info.get("width"),
        height=video_info.get("height"),
        fps=video_info.get("fps"),
        status=VideoStatus.PENDING,
    )

    session.add(video)
    await session.commit()
    await session.refresh(video)

    logger.info("video_created", video_id=str(video.id), filename=video.filename)

    # Add background task for processing
    background_tasks.add_task(
        process_video_task,
        video_id=video.id,
        video_path=str(file_path),
        video_processor=video_processor,
        audio_extractor=audio_extractor,
        transcription=transcription,
        embedding=embedding,
        vector_store=vector_store,
    )

    return VideoUploadResponse(
        id=video.id,
        filename=video.filename,
        status=video.status,
        message="Video added and queued for processing",
    )


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    session: SessionDep,
    background_tasks: BackgroundTasks,
    video_processor: VideoProcessorDep,
    audio_extractor: AudioExtractorDep,
    transcription: TranscriptionDep,
    embedding: EmbeddingDep,
    vector_store: VectorStoreDep,
    file: UploadFile = File(...),
) -> VideoUploadResponse:
    """Upload a video file directly."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Save uploaded file
    upload_path = settings.upload_dir / file.filename

    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Get video info
    try:
        video_info = video_processor.get_video_info(str(upload_path))
    except RuntimeError as e:
        upload_path.unlink()  # Clean up
        raise HTTPException(status_code=400, detail=str(e))

    # Create video record
    video = Video(
        filename=file.filename,
        original_path=str(upload_path),
        file_size=video_info.get("file_size"),
        duration=video_info.get("duration"),
        width=video_info.get("width"),
        height=video_info.get("height"),
        fps=video_info.get("fps"),
        status=VideoStatus.PENDING,
    )

    session.add(video)
    await session.commit()
    await session.refresh(video)

    logger.info("video_uploaded", video_id=str(video.id), filename=video.filename)

    # Add background task for processing
    background_tasks.add_task(
        process_video_task,
        video_id=video.id,
        video_path=str(upload_path),
        video_processor=video_processor,
        audio_extractor=audio_extractor,
        transcription=transcription,
        embedding=embedding,
        vector_store=vector_store,
    )

    return VideoUploadResponse(
        id=video.id,
        filename=video.filename,
        status=video.status,
        message="Video uploaded and queued for processing",
    )


@router.delete("/{video_id}")
async def delete_video(
    video_id: UUID,
    session: SessionDep,
    vector_store: VectorStoreDep,
) -> dict:
    """Delete a video and its associated data."""
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete embeddings from vector store
    vector_store.delete_video_embeddings(video_id)

    # Delete transcripts
    await session.execute(select(Transcript).where(Transcript.video_id == video_id))

    # Delete video record
    await session.delete(video)
    await session.commit()

    logger.info("video_deleted", video_id=str(video_id))

    return {"message": "Video deleted successfully"}


async def process_video_task(
    video_id: UUID,
    video_path: str,
    video_processor: VideoProcessorService,
    audio_extractor: AudioExtractorService,
    transcription: TranscriptionService,
    embedding: EmbeddingService,
    vector_store: VectorStoreService,
) -> None:
    """Background task to process a video."""

    async with async_session_factory() as session:
        try:
            result = await session.execute(select(Video).where(Video.id == video_id))
            video = result.scalar_one_or_none()

            if not video:
                logger.error("video_not_found", video_id=str(video_id))
                return

            # Initialize vector store collections
            vector_store.init_collections()

            # Step 1: Extract keyframes
            video.mark_processing(VideoStatus.EXTRACTING_FRAMES)
            await session.commit()

            keyframes = video_processor.extract_keyframes(video_path, video_id)
            video.keyframe_count = len(keyframes)
            video.frame_count = video_processor.count_frames(video_path)
            await session.commit()

            # Step 2: Extract audio and transcribe
            video.mark_processing(VideoStatus.EXTRACTING_AUDIO)
            await session.commit()

            has_audio = audio_extractor.has_audio(video_path)
            segments = []

            if has_audio:
                audio_path = audio_extractor.extract_audio(video_path, video_id)

                video.mark_processing(VideoStatus.TRANSCRIBING)
                await session.commit()

                segments = transcription.transcribe(audio_path)

                # Save transcripts to database
                for seg in segments:
                    transcript = Transcript(
                        video_id=video_id,
                        text=seg["text"],
                        start_time=seg["start_time"],
                        end_time=seg["end_time"],
                        confidence=seg.get("confidence"),
                        language=seg.get("language"),
                    )
                    session.add(transcript)
                await session.commit()

            # Step 3: Generate embeddings
            video.mark_processing(VideoStatus.EMBEDDING)
            await session.commit()

            # Visual embeddings
            if keyframes:
                frame_paths = [kf["frame_path"] for kf in keyframes]
                visual_embeddings = embedding.embed_images_batch(frame_paths)
                vector_store.store_visual_embeddings(
                    video_id, keyframes, visual_embeddings
                )

            # Speech embeddings
            if segments:
                texts = [seg["text"] for seg in segments]
                speech_embeddings = embedding.embed_texts_batch(texts)
                vector_store.store_speech_embeddings(
                    video_id, segments, speech_embeddings
                )

            # Mark completed
            video.mark_completed()
            await session.commit()

            logger.info(
                "video_processing_complete",
                video_id=str(video_id),
                keyframes=len(keyframes),
                segments=len(segments),
            )

        except Exception as e:
            logger.exception("video_processing_failed", video_id=str(video_id))
            video.mark_failed(str(e))
            await session.commit()
