"""Database configuration and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from .config import get_settings
from .logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Create async engine
async_engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

# Async session factory
async_session_factory = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database tables."""
    logger.info("initializing_database")
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("database_initialized")


async def check_db_connection() -> None:
    """Verify database connection on startup."""
    logger.info("checking_database_connection")
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("database_connected")
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
