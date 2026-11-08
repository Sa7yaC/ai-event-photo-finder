import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger(__name__)

engine_kwargs = {"echo": False}
if settings.ENVIRONMENT == "testing":
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

async_engine = create_async_engine(
    settings.async_database_url,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_database_connection() -> bool:
    """Safely check if the database is reachable with a strict 2-second timeout."""
    import asyncio
    try:
        async def _ping():
            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                return True

        return await asyncio.wait_for(_ping(), timeout=2.0)
    except Exception as e:
        logger.warning("Database connectivity check failed: %s", str(e))
        return False
