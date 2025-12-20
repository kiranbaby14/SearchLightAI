"""Audio extraction service."""

import subprocess
from pathlib import Path
from uuid import UUID

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class AudioExtractorService:
    """Service for extracting audio from videos."""

    def __init__(self) -> None:
        """Initialize audio extractor."""
        self.audio_dir = settings.audio_dir

    def extract_audio(
        self,
        video_path: str,
        video_id: UUID,
        sample_rate: int = 16000,
    ) -> str:
        """
        Extract audio track from video.

        Returns path to extracted audio file.
        """
        logger.info(
            "extracting_audio",
            video_path=video_path,
            video_id=str(video_id),
            sample_rate=sample_rate,
        )

        # Create output directory
        output_dir = self.audio_dir / str(video_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / "audio.wav"

        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-vn",  # No video
            "-acodec",
            "pcm_s16le",  # PCM 16-bit
            "-ar",
            str(sample_rate),  # Sample rate
            "-ac",
            "1",  # Mono
            "-y",  # Overwrite
            str(output_path),
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )
            logger.info("audio_extracted", output_path=str(output_path))
            return str(output_path)

        except subprocess.CalledProcessError as e:
            logger.error(
                "audio_extraction_failed",
                error=e.stderr.decode() if e.stderr else str(e),
            )
            raise RuntimeError(f"Failed to extract audio: {e}")

    def has_audio(self, video_path: str) -> bool:
        """Check if video has an audio track."""
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            video_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return bool(result.stdout.strip())
        except subprocess.CalledProcessError:
            return False
