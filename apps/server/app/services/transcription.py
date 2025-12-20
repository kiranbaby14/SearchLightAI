"""Transcription service using faster-whisper."""

from faster_whisper import WhisperModel

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class TranscriptionService:
    """Service for transcribing audio using faster-whisper."""

    def __init__(self) -> None:
        """Initialize transcription service."""
        self._model: WhisperModel | None = None

    @property
    def model(self) -> WhisperModel:
        """Lazy load the Whisper model."""
        if self._model is None:
            logger.info("loading_whisper_model", model=settings.whisper_model)
            self._model = WhisperModel(
                settings.whisper_model,
                device="auto",
                compute_type="auto",
            )
            logger.info("whisper_model_loaded")
        return self._model

    def transcribe(
        self,
        audio_path: str,
        language: str | None = None,
    ) -> list[dict]:
        """
        Transcribe audio file.

        Returns list of segments with text, start_time, end_time, confidence.
        """
        logger.info("transcribing_audio", audio_path=audio_path, language=language)

        segments_result, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,  # Filter out non-speech
        )

        logger.info(
            "transcription_info",
            language=info.language,
            language_probability=info.language_probability,
            duration=info.duration,
        )

        segments = []
        for segment in segments_result:
            segments.append(
                {
                    "text": segment.text.strip(),
                    "start_time": segment.start,
                    "end_time": segment.end,
                    "confidence": segment.avg_logprob,
                    "language": info.language,
                }
            )

        logger.info("transcription_complete", segment_count=len(segments))
        return segments

    def transcribe_with_words(
        self,
        audio_path: str,
        language: str | None = None,
    ) -> tuple[list[dict], list[dict]]:
        """
        Transcribe with word-level timestamps.

        Returns tuple of (segments, words).
        """
        logger.info(
            "transcribing_with_words",
            audio_path=audio_path,
            language=language,
        )

        segments_result, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
        )

        segments = []
        words = []

        for segment in segments_result:
            segments.append(
                {
                    "text": segment.text.strip(),
                    "start_time": segment.start,
                    "end_time": segment.end,
                    "confidence": segment.avg_logprob,
                    "language": info.language,
                }
            )

            if segment.words:
                for word in segment.words:
                    words.append(
                        {
                            "word": word.word,
                            "start_time": word.start,
                            "end_time": word.end,
                            "probability": word.probability,
                        }
                    )

        logger.info(
            "word_transcription_complete",
            segment_count=len(segments),
            word_count=len(words),
        )

        return segments, words
