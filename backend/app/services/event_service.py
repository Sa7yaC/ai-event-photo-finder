from datetime import datetime, timezone
import hmac
import re
import secrets
from typing import List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.event import EventCreate, EventStatsResponse


class EventService:
    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate a URL-friendly slug with random entropy suffix to guarantee uniqueness."""
        base = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
        if not base:
            base = "event"
        base = base[:60]
        random_suffix = secrets.token_hex(4)
        return f"{base}-{random_suffix}"

    @classmethod
    async def create_event(cls, db: AsyncSession, data: EventCreate) -> Event:
        slug = cls.generate_slug(data.name)
        organizer_token = secrets.token_urlsafe(32)

        event = Event(
            name=data.name,
            description=data.description,
            event_date=data.event_date,
            slug=slug,
            status="active",
            organizer_token=organizer_token,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def get_event_by_id(db: AsyncSession, event_id: uuid.UUID) -> Optional[Event]:
        result = await db.execute(select(Event).where(Event.id == event_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_event_by_slug(db: AsyncSession, slug: str) -> Optional[Event]:
        result = await db.execute(select(Event).where(Event.slug == slug))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_events(db: AsyncSession, limit: int = 50, offset: int = 0) -> List[Event]:
        result = await db.execute(
            select(Event).order_by(Event.created_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    def verify_organizer_token(event: Event, token: Optional[str]) -> bool:
        if not token:
            return False
        return hmac.compare_digest(event.organizer_token, token)

    @staticmethod
    async def get_event_stats(db: AsyncSession, event: Event) -> EventStatsResponse:
        # Aggregate photo counts by processing_status
        result = await db.execute(
            select(Photo.processing_status, func.count(Photo.id))
            .where(Photo.event_id == event.id)
            .group_by(Photo.processing_status)
        )
        counts = dict(result.all())
        
        total_photos = sum(counts.values())
        processed_photos = counts.get("completed", 0)
        pending_photos = counts.get("pending", 0)
        failed_photos = counts.get("failed", 0)

        # Stage 3: count total detected face embeddings for this event
        from app.services.face_service import FaceService  # noqa: PLC0415
        detected_faces = await FaceService.count_detected_faces(db, event.id)

        return EventStatsResponse(
            event_id=event.id,
            event_name=event.name,
            total_photos=total_photos,
            processed_photos=processed_photos,
            pending_photos=pending_photos,
            failed_photos=failed_photos,
            detected_faces=detected_faces,
        )
