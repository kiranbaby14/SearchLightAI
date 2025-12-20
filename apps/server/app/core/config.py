"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "VideoSearch"
    app_env: str = "development"
    debug: bool = False

    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/videosearch"
    )
    database_url_sync: str = "postgresql://postgres:password@localhost:5432/videosearch"

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: str | None = None

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Storage paths
    upload_dir: Path = Path("./uploads")
    frames_dir: Path = Path("./frames")
    audio_dir: Path = Path("./audio")

    # AI Models
    siglip_model: str = "google/siglip-base-patch16-224"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    whisper_model: str = "base"

    # Vector dimensions
    visual_embedding_dim: int = 768
    speech_embedding_dim: int = 384

    def setup_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        for directory in [self.upload_dir, self.frames_dir, self.audio_dir]:
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    settings.setup_directories()
    return settings
