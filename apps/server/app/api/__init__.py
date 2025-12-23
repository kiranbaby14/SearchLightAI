"""API routes."""

from fastapi import APIRouter

from .videos import router as videos_router
from .search import router as search_router

api_router = APIRouter()

api_router.include_router(videos_router, prefix="/videos", tags=["videos"])
api_router.include_router(search_router, prefix="/search", tags=["search"])
