"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import get_settings
from app.core.database import init_db, check_db_connection
from app.core.logging import setup_logging, get_logger
from app.services import VectorStoreService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    logger = get_logger(__name__)
    logger.info("application_starting", app_name=settings.app_name)

    # Initialize database
    # await init_db() - Now alembic is used
    await check_db_connection()

    # Initialize vector store collections
    vector_store = VectorStoreService()
    vector_store.init_collections()

    logger.info("application_started")

    yield

    # Shutdown
    logger.info("application_shutting_down")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Video search application with visual and speech search capabilities",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Mount static file directories for serving videos and frames
# Create directories if they don't exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.frames_dir.mkdir(parents=True, exist_ok=True)
settings.audio_dir.mkdir(parents=True, exist_ok=True)

# Serve uploaded videos
app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")

# Serve extracted frames
app.mount("/frames", StaticFiles(directory=str(settings.frames_dir)), name="frames")


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.app_env,
    }
