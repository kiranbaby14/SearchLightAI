"""Vector store service using Qdrant."""

from uuid import UUID, uuid5, NAMESPACE_DNS

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Collection names
VISUAL_COLLECTION = "visual_embeddings"
SPEECH_COLLECTION = "speech_embeddings"


def generate_point_id(video_id: UUID, index: int, prefix: str = "") -> str:
    """Generate a deterministic UUID for a point based on video_id and index."""
    # Create a deterministic UUID using uuid5
    name = f"{video_id}_{prefix}_{index}"
    return str(uuid5(NAMESPACE_DNS, name))


class VectorStoreService:
    """Service for managing vector embeddings in Qdrant."""

    def __init__(self) -> None:
        """Initialize Qdrant client."""
        self._client: QdrantClient | None = None

    @property
    def client(self) -> QdrantClient:
        """Lazy load Qdrant client."""
        if self._client is None:
            logger.info(
                "connecting_to_qdrant",
                host=settings.qdrant_host,
                port=settings.qdrant_port,
            )
            self._client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                api_key=settings.qdrant_api_key or None,
            )
            logger.info("qdrant_connected")
        return self._client

    def init_collections(self) -> None:
        """Initialize Qdrant collections if they don't exist."""
        collections = self.client.get_collections().collections
        existing_names = {c.name for c in collections}

        # Create visual embeddings collection
        if VISUAL_COLLECTION not in existing_names:
            logger.info("creating_collection", name=VISUAL_COLLECTION)
            self.client.create_collection(
                collection_name=VISUAL_COLLECTION,
                vectors_config=VectorParams(
                    size=settings.visual_embedding_dim,
                    distance=Distance.COSINE,
                ),
            )

        # Create speech embeddings collection
        if SPEECH_COLLECTION not in existing_names:
            logger.info("creating_collection", name=SPEECH_COLLECTION)
            self.client.create_collection(
                collection_name=SPEECH_COLLECTION,
                vectors_config=VectorParams(
                    size=settings.speech_embedding_dim,
                    distance=Distance.COSINE,
                ),
            )

        logger.info("collections_initialized")

    def store_visual_embeddings(
        self,
        video_id: UUID,
        keyframes: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        """
        Store visual embeddings for keyframes.

        keyframes: list of dicts with frame_path, timestamp
        embeddings: corresponding embedding vectors
        """
        logger.info(
            "storing_visual_embeddings",
            video_id=str(video_id),
            count=len(embeddings),
        )

        points = []
        for i, (keyframe, embedding) in enumerate(zip(keyframes, embeddings)):
            # Generate a valid UUID for the point
            point_id = generate_point_id(video_id, i, "visual")
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "video_id": str(video_id),
                        "frame_path": keyframe["frame_path"],
                        "timestamp": keyframe["timestamp"],
                        "scene_index": keyframe.get("scene_index", i),
                    },
                )
            )

        self.client.upsert(
            collection_name=VISUAL_COLLECTION,
            points=points,
        )

        logger.info("visual_embeddings_stored", count=len(points))

    def store_speech_embeddings(
        self,
        video_id: UUID,
        segments: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        """
        Store speech embeddings for transcript segments.

        segments: list of dicts with text, start_time, end_time
        embeddings: corresponding embedding vectors
        """
        logger.info(
            "storing_speech_embeddings",
            video_id=str(video_id),
            count=len(embeddings),
        )

        points = []
        for i, (segment, embedding) in enumerate(zip(segments, embeddings)):
            # Generate a valid UUID for the point
            point_id = generate_point_id(video_id, i, "speech")
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "video_id": str(video_id),
                        "text": segment["text"],
                        "start_time": segment["start_time"],
                        "end_time": segment["end_time"],
                    },
                )
            )

        self.client.upsert(
            collection_name=SPEECH_COLLECTION,
            points=points,
        )

        logger.info("speech_embeddings_stored", count=len(points))

    def search_visual(
        self,
        query_embedding: list[float],
        limit: int = 10,
        score_threshold: float = 0.5,
    ) -> list[dict]:
        """Search for visually similar frames."""
        results = self.client.query_points(
            collection_name=VISUAL_COLLECTION,
            query=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
        )

        return [
            {
                "video_id": r.payload["video_id"],
                "timestamp": r.payload["timestamp"],
                "frame_path": r.payload["frame_path"],
                "score": r.score,
                "type": "visual",
            }
            for r in results.points
        ]

    def search_speech(
        self,
        query_embedding: list[float],
        limit: int = 10,
        score_threshold: float = 0.5,
    ) -> list[dict]:
        """Search for semantically similar speech segments."""
        results = self.client.query_points(
            collection_name=SPEECH_COLLECTION,
            query=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
        )

        return [
            {
                "video_id": r.payload["video_id"],
                "timestamp": r.payload["start_time"],
                "end_timestamp": r.payload["end_time"],
                "text": r.payload["text"],
                "score": r.score,
                "type": "speech",
            }
            for r in results.points
        ]

    def delete_video_embeddings(self, video_id: UUID) -> None:
        """Delete all embeddings for a video."""
        video_id_str = str(video_id)

        # Delete from visual collection
        self.client.delete(
            collection_name=VISUAL_COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="video_id",
                            match=models.MatchValue(value=video_id_str),
                        )
                    ]
                )
            ),
        )

        # Delete from speech collection
        self.client.delete(
            collection_name=SPEECH_COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="video_id",
                            match=models.MatchValue(value=video_id_str),
                        )
                    ]
                )
            ),
        )

        logger.info("video_embeddings_deleted", video_id=video_id_str)
