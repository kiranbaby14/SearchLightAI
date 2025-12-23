"""Search routes."""

from uuid import UUID

from fastapi import APIRouter
from sqlmodel import select

from app.core.dependencies import (
    SessionDep,
    EmbeddingDep,
    VectorStoreDep,
)
from app.core.logging import get_logger
from app.models import Video
from app.schemas import SearchQuery, SearchResult, SearchResponse, SearchType

logger = get_logger(__name__)
router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search_videos(
    query: SearchQuery,
    session: SessionDep,
    embedding: EmbeddingDep,
    vector_store: VectorStoreDep,
) -> SearchResponse:
    """
    Search videos by natural language query.

    Supports visual search (describing scenes), speech search (what was said),
    or hybrid search combining both.
    """
    logger.info(
        "search_request",
        query=query.query,
        search_type=query.search_type,
        limit=query.limit,
    )

    results = []

    # Visual search
    if query.search_type in (SearchType.VISUAL, SearchType.HYBRID):
        visual_embedding = embedding.embed_text_visual(query.query)
        visual_results = vector_store.search_visual(
            query_embedding=visual_embedding,
            limit=query.limit,
            score_threshold=query.threshold,
        )
        results.extend(visual_results)

    # Speech search
    if query.search_type in (SearchType.SPEECH, SearchType.HYBRID):
        speech_embedding = embedding.embed_text(query.query)
        speech_results = vector_store.search_speech(
            query_embedding=speech_embedding,
            limit=query.limit,
            score_threshold=query.threshold,
        )
        results.extend(speech_results)

    # Sort by score and deduplicate
    results.sort(key=lambda x: x["score"], reverse=True)

    # Limit results
    results = results[: query.limit]

    # Enrich with video metadata
    video_ids = {UUID(r["video_id"]) for r in results}
    video_query = await session.execute(select(Video).where(Video.id.in_(video_ids)))
    videos = {str(v.id): v for v in video_query.scalars().all()}

    search_results = []
    for r in results:
        video = videos.get(r["video_id"])
        if video:
            search_results.append(
                SearchResult(
                    video_id=UUID(r["video_id"]),
                    video_filename=video.filename,
                    timestamp=r["timestamp"],
                    end_timestamp=r.get("end_timestamp"),
                    score=r["score"],
                    result_type=r["type"],
                    transcript_text=r.get("text"),
                    frame_path=r.get("frame_path"),
                )
            )

    logger.info("search_complete", result_count=len(search_results))

    return SearchResponse(
        query=query.query,
        search_type=query.search_type,
        results=search_results,
        total_results=len(search_results),
    )


@router.get("/video/{video_id}/transcript")
async def get_video_transcript(
    video_id: UUID,
    session: SessionDep,
) -> dict:
    """Get full transcript for a video."""
    from app.models import Transcript

    result = await session.execute(
        select(Transcript)
        .where(Transcript.video_id == video_id)
        .order_by(Transcript.start_time)
    )
    transcripts = result.scalars().all()

    return {
        "video_id": str(video_id),
        "segments": [
            {
                "text": t.text,
                "start_time": t.start_time,
                "end_time": t.end_time,
            }
            for t in transcripts
        ],
    }
