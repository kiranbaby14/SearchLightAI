"""Video processing service for scene detection and keyframe extraction."""

import subprocess
from pathlib import Path
from uuid import UUID

from scenedetect import detect, ContentDetector, AdaptiveDetector
from scenedetect.scene_manager import save_images

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class VideoProcessorService:
    """Service for processing videos and extracting keyframes."""

    def __init__(self) -> None:
        """Initialize video processor."""
        self.frames_dir = settings.frames_dir

    def get_video_info(self, video_path: str) -> dict:
        """
        Extract video metadata using ffprobe.

        Returns dict with duration, width, height, fps.
        """
        logger.info("extracting_video_info", video_path=video_path)

        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            video_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            import json

            data = json.loads(result.stdout)

            # Find video stream
            video_stream = next(
                (s for s in data.get("streams", []) if s["codec_type"] == "video"), None
            )

            info = {
                "duration": float(data.get("format", {}).get("duration", 0)),
                "file_size": int(data.get("format", {}).get("size", 0)),
            }

            if video_stream:
                info["width"] = video_stream.get("width")
                info["height"] = video_stream.get("height")

                # Parse fps from frame rate string like "30/1"
                fps_str = video_stream.get("r_frame_rate", "0/1")
                if "/" in fps_str:
                    num, den = map(int, fps_str.split("/"))
                    info["fps"] = num / den if den else 0
                else:
                    info["fps"] = float(fps_str)

            logger.info("video_info_extracted", **info)
            return info

        except subprocess.CalledProcessError as e:
            logger.error("ffprobe_failed", error=str(e))
            raise RuntimeError(f"Failed to get video info: {e}")

    def extract_thumbnail(
        self,
        video_path: str,
        video_id: UUID,
        time_percent: float = 0.1,
        width: int = 640,
    ) -> str | None:
        """Extract a thumbnail at a percentage of video duration."""
        logger.info(
            "extracting_thumbnail",
            video_path=video_path,
            video_id=str(video_id),
            time_percent=time_percent,
        )

        try:
            # Get video duration
            info = self.get_video_info(video_path)
            duration = info.get("duration", 0)

            # Calculate timestamp (default to 10% into the video, min 0.5s, max 30s)
            timestamp = max(0.5, min(duration * time_percent, 30.0))

            # Create output directory
            output_dir = self.frames_dir / str(video_id)
            output_dir.mkdir(parents=True, exist_ok=True)

            thumbnail_path = output_dir / "thumbnail.jpg"

            cmd = [
                "ffmpeg",
                "-ss",
                str(timestamp),
                "-i",
                video_path,
                "-vframes",
                "1",
                "-vf",
                f"scale={width}:-1",  # Scale width, auto height
                "-q:v",
                "2",  # High quality JPEG
                "-y",  # Overwrite if exists
                str(thumbnail_path),
            ]

            subprocess.run(cmd, capture_output=True, check=True)

            logger.info("thumbnail_extracted", path=str(thumbnail_path))
            return str(thumbnail_path)

        except subprocess.CalledProcessError as e:
            logger.warning(
                "thumbnail_extraction_failed",
                video_id=str(video_id),
                error=e.stderr.decode() if e.stderr else str(e),
            )
            return None
        except Exception as e:
            logger.warning(
                "thumbnail_extraction_error",
                video_id=str(video_id),
                error=str(e),
            )
            return None

    def extract_keyframes(
        self,
        video_path: str,
        video_id: UUID,
        threshold: float = 27.0,
    ) -> list[dict]:
        """
        Detect scenes and extract keyframes.

        Returns list of dicts with frame_path and timestamp.
        """
        logger.info(
            "extracting_keyframes",
            video_path=video_path,
            video_id=str(video_id),
            threshold=threshold,
        )

        # Create output directory for this video
        output_dir = self.frames_dir / str(video_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Detect scenes using content detector
        scenes = detect(
            video_path,
            ContentDetector(threshold=threshold),
            show_progress=False,
        )

        logger.info("scenes_detected", count=len(scenes))

        if not scenes:
            # If no scenes detected, use adaptive detector
            scenes = detect(
                video_path,
                AdaptiveDetector(),
                show_progress=False,
            )
            logger.info("scenes_detected_adaptive", count=len(scenes))

        # Extract keyframes from each scene
        keyframes = []

        for i, (start_time, end_time) in enumerate(scenes):
            # Get frame at start and middle of scene
            timestamps = [start_time.get_seconds()]

            # Add middle frame for longer scenes
            duration = end_time.get_seconds() - start_time.get_seconds()
            if duration > 2.0:
                mid_time = start_time.get_seconds() + duration / 2
                timestamps.append(mid_time)

            for ts in timestamps:
                frame_filename = f"frame_{i:04d}_{ts:.2f}.jpg"
                frame_path = output_dir / frame_filename

                # Extract frame using ffmpeg
                success = self._extract_frame(video_path, ts, str(frame_path))

                if success:
                    keyframes.append(
                        {
                            "frame_path": str(frame_path),
                            "timestamp": ts,
                            "scene_index": i,
                        }
                    )

        logger.info("keyframes_extracted", count=len(keyframes))
        return keyframes

    def _extract_frame(
        self,
        video_path: str,
        timestamp: float,
        output_path: str,
    ) -> bool:
        """Extract a single frame at the given timestamp."""
        cmd = [
            "ffmpeg",
            "-ss",
            str(timestamp),
            "-i",
            video_path,
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-y",
            output_path,
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )
            return True
        except subprocess.CalledProcessError as e:
            logger.warning(
                "frame_extraction_failed",
                timestamp=timestamp,
                error=str(e),
            )
            return False

    def count_frames(self, video_path: str) -> int:
        """Count total frames in video."""
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-count_frames",
            "-show_entries",
            "stream=nb_read_frames",
            "-of",
            "default=nokey=1:noprint_wrappers=1",
            video_path,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return int(result.stdout.strip())
        except (subprocess.CalledProcessError, ValueError):
            return 0
