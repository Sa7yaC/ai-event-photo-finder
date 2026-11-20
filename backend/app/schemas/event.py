from datetime import date, datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field, field_validator


class EventCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Event name")
    description: Optional[str] = Field(None, max_length=2000, description="Optional event description")
    event_date: Optional[date] = Field(None, description="Event date (YYYY-MM-DD)")
    host_name: Optional[str] = Field(None, max_length=120, description="Display name of the event host")

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Event name cannot be empty or whitespace only")
        return cleaned


class EventResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    slug: str
    status: str
    host_name: Optional[str] = None
    match_tolerance: float = 0.5
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventCreatedResponse(EventResponse):
    organizer_token: str = Field(
        ...,
        description="Secret management token. Save this token to manage or upload photos to the event."
    )


class EventStatsResponse(BaseModel):
    event_id: uuid.UUID
    event_name: str
    total_photos: int = 0
    processed_photos: int = 0
    pending_photos: int = 0
    failed_photos: int = 0
    detected_faces: int = 0
    attendees: int = 0


class EventViewResponse(EventResponse):
    """Public event page payload: host-facing and attendee-facing metadata."""

    is_host: bool = False
    attendees: int = 0
    total_photos: int = 0


class EventSettingsUpdate(BaseModel):
    match_tolerance: float = Field(
        ...,
        ge=0.2,
        le=0.8,
        description="Host-defined face similarity tolerance used by attendee searches.",
    )
